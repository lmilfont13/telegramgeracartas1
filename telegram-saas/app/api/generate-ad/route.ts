import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import * as cheerio from 'cheerio';
import Groq from 'groq-sdk';
import { extractMLAffiliateLink } from '../../../lib/ml-extractor';
import { processProductImage } from '../../../lib/image-processor';

puppeteer.use(StealthPlugin());

async function scrapeAmazon(url: string) {
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
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

        const image = $('#landingImage').attr('src') || $('#imgBlkFront').attr('src');

        return { title, price, installments, image, platform: 'Amazon' };
    } catch (error) {
        console.error('Error scraping Amazon:', error);
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
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

        await new Promise(r => setTimeout(r, 5000));

        const content = await page.content();
        const $ = cheerio.load(content);

        const title = $('._2rQP1z span').text().trim() || $('div._44qnta span').text().trim();
        const price = $('div.pqTWkA').text().trim() || $('div._2v0hgB').text().trim();
        const image = $('div._2JMB9h').css('background-image')?.replace('url("', '').replace('")', '') || $('div.flex.flex-column._3csuJj > div > div').css('background-image')?.replace('url("', '').replace('")', '');

        return { title, price, installments: '', image, platform: 'Shopee' };
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

        let productData: any;
        if (productUrl.includes('amazon')) {
            productData = await scrapeAmazon(productUrl);
        } else if (productUrl.includes('mercadolivre')) {
            productData = await extractMLAffiliateLink(productUrl);
        } else if (productUrl.includes('shopee')) {
            productData = await scrapeShopee(productUrl);
        } else {
            return NextResponse.json({ error: 'Plataforma não suportada' }, { status: 400 });
        }

        if (!productData) {
            return NextResponse.json({ error: 'Falha ao extrair dados do produto' }, { status: 500 });
        }

        // 🖼️ Standardization: Process Image to 1000x1000 Square
        if (productData.image && productData.image.startsWith('http')) {
            console.log(`[SaaS-IMAGE] Padronizando imagem...`);
            productData.image = await processProductImage(productData.image);
        }

        const client = new Groq({
            apiKey: groqApiKey || process.env.GROQ_API_KEY,
        });

        const prompt = `
            Você é um especialista em copywriting persuasivo para Telegram.
            Crie um anúncio curto e impactante para o seguinte produto:
            
            Nome: ${productData.title}
            Preço: R$ ${productData.price}
            Parcelamento: ${productData.installments || 'Confira opções no site'}
            Link: ${productData.affiliateLink || affiliateLink || productUrl}
            
            Use emojis e gatilhos mentais. 
            Formate para o Telegram (negrito no preço e nome).
        `;

        const completion = await client.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: 'llama3-70b-8192',
        });

        const adCopy = completion.choices[0]?.message?.content || 'Falha ao gerar copy.';

        return NextResponse.json({
            ...productData,
            adCopy,
            // If the extractor returned an affiliateLink, use it
            affiliateLink: productData.affiliateLink || affiliateLink || productUrl
        });

    } catch (error: any) {
        console.error('Error handling ad generation:', error);
        return NextResponse.json({ error: 'Erro interno: ' + error.message }, { status: 500 });
    }
}
