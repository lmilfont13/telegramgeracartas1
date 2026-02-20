import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import path from 'path';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const SHARED_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export async function extractMLAffiliateLink(productUrl: string) {
    // ADJUSTED PATHS for SaaS environment correctly pointing to the root where scripts run
    const userDataDir = path.resolve(process.cwd(), '../telegram-ad-generator/ml_session_data');
    const cookiesPath = path.resolve(process.cwd(), '../telegram-ad-generator/ml_cookies.json');
    console.log(`[DEBUG-SaaS] Usando userDataDir: ${userDataDir}`);

    const browser = await puppeteer.launch({
        headless: true,
        userDataDir,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--window-size=1920,1080',
            '--disable-blink-features=AutomationControlled'
        ]
    });

    try {
        const pages = await browser.pages();
        const page = pages.length > 0 ? pages[0] : await browser.newPage();

        await page.setViewport({ width: 1920, height: 1080 });
        await page.setUserAgent(SHARED_UA);

        // 1. INJEÇÃO DE COOKIES
        if (fs.existsSync(cookiesPath)) {
            console.log(`[DEBUG-SaaS] Injetando cookies salvos...`);
            const cookies = JSON.parse(fs.readFileSync(cookiesPath, 'utf-8'));
            await page.setCookie(...cookies);
        }

        console.log(`[DEBUG-SaaS] Navegando para o produto...`);
        await page.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await new Promise(r => setTimeout(r, 8000));

        // 2. SCANNER AGRESSIVO DE LINKS
        const scanFn = `(function() {
            const patterns = [/mercadolivre\\.com\\.br\\/sec\\/[a-zA-Z0-9]+/i, /mercadolivre\\.com\\/sec\\/[a-zA-Z0-9]+/i, /ml-afiliados\\.mercadolivre\\.com\\.br\\/[a-zA-Z0-9]+/i];
            const findMatch = (text) => {
                if (!text) return null;
                for (let p of patterns) {
                    const m = String(text).match(p);
                    if (m) return m[0];
                }
                return null;
            };

            const findByLabel = (labelTxt) => {
                const els = Array.from(document.querySelectorAll('label, span, div, p, strong, b'));
                const target = els.find(el => (el.innerText || el.textContent || '').trim().toLowerCase().includes(labelTxt.toLowerCase()));
                if (target) {
                    let curr = target;
                    for (let i = 0; i < 6; i++) {
                        if (!curr) break;
                        const input = curr.querySelector('input, textarea');
                        if (input && input.value) {
                             const m = findMatch(input.value);
                             if (m) return m;
                        }
                        curr = curr.parentElement;
                    }
                }
                return null;
            };

            return findByLabel('Link do produto') || findByLabel('Texto sugerido') || 
                   Array.from(document.querySelectorAll('a')).map(a => a.href).find(findMatch) ||
                   Array.from(document.querySelectorAll('input, textarea')).map(i => i.value).find(findMatch);
        })()`;

        let affiliateLink = await page.evaluate(scanFn) as string | null;

        // 3. CLIQUE POR COORDENADAS (RESOLVE PROBLEMAS DE MODAL/OVERLAY)
        if (!affiliateLink) {
            console.log('[DEBUG-SaaS] Tentando clique físico no botão "Compartilhar"...');

            const btnPos = await page.evaluate(`(function() {
                const btns = Array.from(document.querySelectorAll('button, a, span, div'));
                const btn = btns.find(b => {
                    const t = (b.innerText || b.textContent || '').trim();
                    const rect = b.getBoundingClientRect();
                    return (t === 'Compartilhar' || t === 'Link') && rect.top < 200 && rect.width > 0;
                });
                if (btn) {
                    const r = btn.getBoundingClientRect();
                    return { x: r.left + r.width/2, y: r.top + r.height/2 };
                }
                return null;
            })()`) as { x: number, y: number } | null;

            if (btnPos) {
                await page.mouse.click(btnPos.x, btnPos.y);
                console.log(`[DEBUG-SaaS] Clique em ${JSON.stringify(btnPos)}. Aguardando modal (12s)...`);
                await new Promise(r => setTimeout(r, 12000));

                affiliateLink = await page.evaluate(scanFn) as string | null;

                // TENTATIVA FINAL: Clique no centro da tela
                if (!affiliateLink) {
                    console.log('[DEBUG-SaaS] Link não detectado. Tentando clique forçado no centro do modal...');
                    await page.mouse.click(960, 540);
                    await new Promise(r => setTimeout(r, 4000));
                    affiliateLink = await page.evaluate(scanFn) as string | null;
                }
            }
        }

        // 4. SCRAPE DATA
        const productData = await page.evaluate(`(function() {
            const getTxt = (s) => document.querySelector(s)?.textContent.trim() || '';
            const title = getTxt('h1.ui-pdp-title') || getTxt('.ui-pdp-header__title');
            const price = document.querySelector('meta[itemprop="price"]')?.getAttribute('content')?.replace('.', ',') || '0,00';
            const imgEl = document.querySelector('.ui-pdp-gallery__figure img, [data-index="0"] img');
            const image = imgEl ? (imgEl.getAttribute('src') || imgEl.getAttribute('data-src')) : '';
            return { title, price, image, platform: 'Mercado Livre' };
        })()`) as any;

        if (affiliateLink) {
            console.log(`[DEBUG-SaaS] SUCESSO: ${affiliateLink}`);
        } else {
            console.warn('[WARN-SaaS] Falha na extração.');
        }

        return {
            ...productData,
            affiliateLink: affiliateLink || productUrl
        };

    } catch (error) {
        console.error('[ERROR-SaaS] Erro na extração:', error);
        throw error;
    } finally {
        await browser.close();
    }
}
