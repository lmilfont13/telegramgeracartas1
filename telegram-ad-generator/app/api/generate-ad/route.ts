import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import * as cheerio from 'cheerio';
import Groq from 'groq-sdk';

puppeteer.use(StealthPlugin());

// Groq client initialized inside handler

async function scrapeAmazon(url: string) {
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-accelerated-2d-canvas', '--no-first-run', '--no-zygote', '--single-process', '--disable-gpu'],
        });
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

        const content = await page.content();
        const $ = cheerio.load(content);

        const title = $('#productTitle').text().trim();
        const priceWhole = $('.a-price-whole').first().text().replace('.', '').trim();
        const priceFraction = $('.a-price-fraction').first().text().trim();
        const price = `${priceWhole},${priceFraction}`;

        let installments = '';
        $('#installmentCalculator_feature_div .a-text-bold').each((i, el) => {
            const text = $(el).text().trim();
            if (text.includes('x') && text.includes('juros')) {
                installments = text;
            }
        });

        if (!installments) {
            const bestOffer = $('#best_offer_div .a-text-bold').text().trim();
            if (bestOffer) installments = bestOffer;
        }

        const image = $('#landingImage').attr('src') || $('#imgBlkFront').attr('src');

        return { title, price, installments, image, platform: 'Amazon' };
    } catch (error) {
        console.error('Error scraping Amazon:', error);
        return null;
    } finally {
        if (browser) await browser.close();
    }
}

async function scrapeMercadoLivre(url: string) {
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-accelerated-2d-canvas', '--no-first-run', '--no-zygote', '--single-process', '--disable-gpu'],
        });
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

        const content = await page.content();
        const $ = cheerio.load(content);

        const title = $('h1.ui-pdp-title').text().trim();
        const priceMeta = $('meta[itemprop="price"]').attr('content');
        const price = priceMeta ? priceMeta.replace('.', ',') : '';

        const installments = $('.ui-pdp-color--BLACK.ui-pdp-size--MEDIUM.ui-pdp-family--REGULAR').first().text().trim();

        const image = $('figure.ui-pdp-gallery__figure > img').attr('src');

        return { title, price, installments, image, platform: 'Mercado Livre' };
    } catch (error) {
        console.error('Error scraping Mercado Livre:', error);
        return null;
    } finally {
        if (browser) await browser.close();
    }
}

async function scrapeShopee(url: string) {
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-accelerated-2d-canvas', '--no-first-run', '--no-zygote', '--single-process', '--disable-gpu'],
        });
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

        // Wait for dynamic content
        await new Promise(r => setTimeout(r, 5000));

        const content = await page.content();
        const $ = cheerio.load(content);

        const title = $('._2rQP1z span').text().trim() || $('div._44qnta span').text().trim();
        const price = $('div.pqTWkA').text().trim() || $('div._2v0hgB').text().trim();

        const installments = ''; // Harder to get on Shopee dynamically

        const image = $('div._2JMB9h').css('background-image')?.replace('url("', '').replace('")', '') || $('div.flex.flex-column._3csuJj > div > div').css('background-image')?.replace('url("', '').replace('")', '');

        return { title, price, installments, image, platform: 'Shopee' };
    } catch (error) {
        console.error('Error scraping Shopee:', error);
        return null;
    } finally {
        if (browser) await browser.close();
    }
}

export async function POST(req: NextRequest) {
    try {
        const { productUrl, affiliateLink, groqApiKey } = await req.json();

        if (!productUrl) {
            return NextResponse.json({ error: 'URL do produto é obrigatória' }, { status: 400 });
        }

        let productData;
        if (productUrl.includes('amazon')) {
            productData = await scrapeAmazon(productUrl);
        } else if (productUrl.includes('mercadolivre')) {
            productData = await scrapeMercadoLivre(productUrl);
        } else if (productUrl.includes('shopee')) {
            productData = await scrapeShopee(productUrl);
        } else {
            return NextResponse.json({ error: 'Plataforma não suportada (apenas Amazon, ML, Shopee)' }, { status: 400 });
        }

        if (!productData) {
            // Fallback manually if scrape fails? Or just return error
            return NextResponse.json({ error: 'Falha ao extrair dados do produto' }, { status: 500 });
        }

        // Generate Copy with Groq
        const client = new Groq({
            apiKey: groqApiKey || process.env.GROQ_API_KEY,
        });

        const prompt = `
            Você é um especialista em copywriting persuasivo para vendas no Telegram.
            Crie um anúncio curto e impactante para o seguinte produto:
            
            Nome: ${productData.title}
            Preço: R$ ${productData.price}
            Parcelamento: ${productData.installments}
            Link: ${affiliateLink || productUrl}
            
            Use emojis, gatilhos mentais de escassez e oportunidade. 
            Formate para ficar bonito no Telegram (negrito no preço e nome).
            Não use markdown de código.
        `;

        const models = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'llama3-8b-8192'];
        let adCopy = '';
        let lastError = null;

        for (const model of models) {
            try {
                const completion = await client.chat.completions.create({
                    messages: [{ role: 'user', content: prompt }],
                    model: model,
                });
                adCopy = completion.choices[0]?.message?.content || '';
                if (adCopy) break; // Success
            } catch (error: any) {
                console.warn(`Model ${model} failed:`, error.message);
                lastError = error;
                // Continue to next model
            }
        }

        if (!adCopy) {
            throw lastError || new Error('Todas as tentativas de modelo falharam.');
        }

        return NextResponse.json({
            ...productData,
            adCopy,
        });

    } catch (error) {
        console.error('Error handling ad generation:', error);
        return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 });
    }
}
