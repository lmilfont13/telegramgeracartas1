import { Telegraf, Input, Markup } from 'telegraf';
import { generateFullAd } from '../lib/ad-engine.js';
import { scrapeLinksFromListing, scrapeDetailedListing, ProductListingItem } from '../lib/listing-scraper.js';
import * as dotenv from 'dotenv';
import path from 'path';
import { processProductImage } from '../lib/image-processor.js';

import fs from 'fs';

// Load env from .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const botToken = process.env.TELEGRAM_BOT_TOKEN || '';
const channelId = process.env.TELEGRAM_CHANNEL_ID || '';
const sessionExists = fs.existsSync(path.join(process.cwd(), 'ml_session_data'));

console.log('--- DEBUG DE CONFIGURAÇÃO ---');
console.log(`Token definido: ${botToken ? 'SIM' : 'NÃO'}`);
console.log(`ID do Canal: ${channelId}`);
console.log(`Sessão logada (.ml-session): ${sessionExists ? '✅ OK' : '❌ NÃO ENCONTRADA'}`);
console.log('-----------------------------\n');

if (!sessionExists) {
    console.warn('⚠️ AVISO: A pasta ml_session_data não foi encontrada. O robô não conseguirá gerar links de afiliados sem estar logado.');
    console.warn('⚠️ Por favor, execute: npx tsx scripts/login-ml.ts e faça o login primeiro.');
}

if (!botToken || botToken === 'insira_o_token_aqui') {
    console.error('❌ ERRO: Você ainda não configurou o TELEGRAM_BOT_TOKEN no arquivo .env.local');
    process.exit(1);
}

const bot = new Telegraf(botToken);

// Registro de Comandos no Menu do Telegram (Slash Button)
bot.telegram.setMyCommands([
    { command: 'search', description: '🔍 Buscar produto nas lojas' },
    { command: 'deals', description: '💰 Ver ofertas do dia' },
    { command: 'bestsellers', description: '🏆 Ver mais vendidos' },
    { command: 'catalog', description: '🛍️ Varredura de catálogo/link' },
    { command: 'auto', description: '⚙️ Configurar postagem automática' },
    { command: 'stop', description: '🛑 Parar varredura atual' },
    { command: 'restart', description: '🔄 Reiniciar o robô' },
    { command: 'help', description: '❓ Ajuda e comandos' }
]).then(() => console.log('[CONFIG] Menu de comandos registrado com sucesso.'));

// Persistence for Processed Links (prevents duplicates in catalog scans)
const PROCESSED_PATH = path.join(process.cwd(), 'processed_links.json');
let processedLinks = new Set<string>();

// Interactive State Management
type BotState = {
    type: 'awaiting_quantity' | 'awaiting_catalog_quantity' | 'awaiting_platform' | 'curation';
    url?: string;
    platform?: 'amazon' | 'ml' | 'shopee' | 'both';
    description?: string;
    term?: string;
    results?: ProductListingItem[];
};
const userState = new Map<number, BotState>();

// Global caches for curation and ads
(bot as any)._adCache = {};
(bot as any)._curationCache = {};
(bot as any)._curationPlatform = {};

if (fs.existsSync(PROCESSED_PATH)) {
    try {
        const data = JSON.parse(fs.readFileSync(PROCESSED_PATH, 'utf-8'));
        if (Array.isArray(data)) {
            processedLinks = new Set(data);
            console.log(`[CONFIG] ${processedLinks.size} links processados carregados.`);
        }
    } catch (e) {
        console.error('[CONFIG] Erro ao carregar links processados:', e);
    }
}

const saveProcessedLinks = () => {
    fs.writeFileSync(PROCESSED_PATH, JSON.stringify(Array.from(processedLinks)));
};

// Persistence for Auto-Post Mode
const CONFIG_PATH = path.join(process.cwd(), 'bot_config.json');
let autoPost = false;

if (fs.existsSync(CONFIG_PATH)) {
    try {
        const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
        autoPost = !!config.autoPost;
        console.log(`[CONFIG] Auto-Post carregado: ${autoPost ? 'LIGADO' : 'DESLIGADO'}`);
    } catch (e) {
        console.error('[CONFIG] Erro ao carregar config:', e);
    }
}

const saveConfig = () => {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify({ autoPost }));
};

// State for active catalog scans (allows cancellation)
const activeScans = new Set<number>(); // Set of chat IDs currently scanning

// 0. Help Command & Startup (Registered FIRST to ensure it works)
const HELP_MESSAGE = `
🤖 *COMANDOS DISPONÍVEIS:*

🛍️ */catalog <link>*
_Inicia a varredura de um catálogo ou página de busca do ML._
Ex: \`/catalog https://lista.mercadolivre.com.br/...\`

⚙️ */auto status*
_Verifica se o modo automático está ligado ou desligado._

🟢 */auto on*
_Ativa postagem automática no canal (sem revisão)._

🔴 */auto off*
_Desativa automático. Você revisa e clica para postar._

🛑 */stop*
_Para imediatamente qualquer varredura em andamento._

❓ */help*
_Mostra esta mensagem de ajuda._
`;

bot.command('help', (ctx) => ctx.replyWithMarkdown(HELP_MESSAGE));
bot.start((ctx) => {
    ctx.reply(`Olá, ${ctx.from.first_name}! 👋\nEu sou o seu Gerador de Anúncios com IA.\n\n${HELP_MESSAGE}`);
});

/**
 * Normaliza URLs do Mercado Livre removendo parâmetros de rastreio
 * para evitar duplicados e melhorar o cache.
 */
function normalizeUrl(url: string): string {
    try {
        if (url.includes('mercadolivre.com.br')) {
            const u = new URL(url);
            return u.origin + u.pathname;
        }
    } catch (e) {
        // Fallback para URL original se houver erro no parse
    }
    return url;
}

async function processProduct(url: string, ctx: any, forcedPlatform?: 'amazon' | 'ml' | 'shopee') {
    console.log(`[DEBUG_TRACE] processProduct iniciado para: ${url} (Forced: ${forcedPlatform})`);
    const cleanUrl = normalizeUrl(url);
    console.log(`[DEBUG_TRACE] URL normalizada: ${cleanUrl}`);

    if (processedLinks.has(cleanUrl) && !forcedPlatform) {
        console.log(`[DEBUG] Link ignorado (já processado): ${cleanUrl}`);
        if (ctx.message && ctx.message.text === url) {
            await ctx.reply('⚠️ Este link já foi processado anteriormente.');
        }
        return;
    }

    const targetId = ctx.chat?.id || 0;
    console.log(`\n🤖 Processando para Chat ${targetId}: ${cleanUrl}`);

    let attempts = 0;
    const maxAttempts = 2;

    while (attempts < maxAttempts) {
        attempts++;
        try {
            console.log(`[DEBUG] Tentativa ${attempts}/${maxAttempts} para ${cleanUrl}`);
            const ad = await generateFullAd(cleanUrl, undefined, forcedPlatform);
            console.log(`[DEBUG] generateFullAd retornou: ${ad ? 'SUCESSO' : 'NULL'}`);

            if (!ad) throw new Error('Falha ao gerar anúncio (Dados nulos)');

            if (ad.image && ad.image.startsWith('http')) {
                console.log(`[IMAGE] Padronizando imagem...`);
                const imgPromise = processProductImage(ad.image);
                const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout de imagem')), 15000));
                ad.image = await Promise.race([imgPromise, timeoutPromise]) as string;
            }

            console.log(`✅ Ad Gerado! Enviando para o chat...`);

            const adId = `post_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
            const keyboard = {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "🚀 Postar no Canal", callback_data: adId }]
                    ]
                }
            };

            (bot as any)._adCache = (bot as any)._adCache || {};
            (bot as any)._adCache[adId] = ad;

            if (ad.image) {
                const photo = ad.image.startsWith('http') ? ad.image : { source: ad.image };
                await bot.telegram.sendPhoto(targetId, photo, {
                    caption: ad.adCopy,
                    ...(autoPost ? {} : keyboard)
                });
            } else {
                await bot.telegram.sendMessage(targetId, ad.adCopy, autoPost ? {} : keyboard);
            }

            if (autoPost && channelId) {
                console.log(`[AUTO] Enviando para o canal: ${channelId}`);
                if (ad.image) {
                    if (ad.image.startsWith('http')) {
                        await bot.telegram.sendPhoto(channelId, ad.image, { caption: ad.adCopy });
                    } else {
                        const localPath = path.resolve(ad.image);
                        await bot.telegram.sendPhoto(channelId, Input.fromLocalFile(localPath), { caption: ad.adCopy });
                    }
                } else {
                    await bot.telegram.sendMessage(channelId, ad.adCopy);
                }
            }

            processedLinks.add(cleanUrl);
            saveProcessedLinks();
            return;

        } catch (err: any) {
            console.error(`❌ Erro na tentativa ${attempts}:`, err.message);
            if (attempts === maxAttempts) {
                await ctx.reply(`❌ Erro persistente ao processar link: ${cleanUrl}\nMotivo: ${err.message}`);
            } else {
                console.log(`[RETRY] Tentando novamente em 3 segundos...`);
                await new Promise(r => setTimeout(r, 3000));
            }
        }
    }
}

// Utility to wrap callback handlers and ignore "query is too old" errors
const safeAction = (handler: (ctx: any) => Promise<any>) => async (ctx: any) => {
    try {
        await handler(ctx);
    } catch (e: any) {
        if (e.message?.includes('query is too old') || e.message?.includes('query ID is invalid')) {
            console.warn('[TELEGRAM] Callback ignorado (expirado ou inválido).');
        } else {
            console.error('[TELEGRAM] Erro em callback:', e.message);
        }
    }
};

// --- DISCOVERY COMMANDS ---

// 1. /deals - Menu de Ofertas
bot.command('deals', async (ctx) => {
    await ctx.reply('💰 **Onde você quer buscar ofertas agora?**', {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
            [
                Markup.button.callback('📦 Amazon (Gold Box)', 'find_deals_amazon'),
                Markup.button.callback('🤝 ML (Ofertas do Dia)', 'find_deals_ml')
            ],
            [
                Markup.button.callback('🛍️ Shopee (Ofertas)', 'find_deals_shopee'),
                Markup.button.callback('⚖️ TODAS (Comparar)', 'find_deals_both')
            ]
        ])
    });
});

// 2. /bestsellers - Menu de Mais Vendidos
bot.command('bestsellers', async (ctx) => {
    await ctx.reply('🏆 **Quais os Mais Vendidos que vamos vasculhar?**', {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
            [
                Markup.button.callback('📦 Amazon Best Sellers', 'find_best_amazon'),
                Markup.button.callback('🤝 ML Mais Vendidos', 'find_best_ml')
            ],
            [
                Markup.button.callback('🛍️ Shopee Best Sellers', 'find_best_shopee'),
                Markup.button.callback('⚖️ TODAS (Comparar)', 'find_best_both')
            ]
        ])
    });
});

// 3. /search - Busca Direta
bot.command('search', async (ctx) => {
    const term = ctx.message.text.split(' ').slice(1).join(' ');
    if (!term) return ctx.reply('Use: /search <produto>\nEx: /search air fryer');

    await ctx.reply(`🔍 **Onde vamos buscar "${term}"?**`, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
            [
                Markup.button.callback('📦 Amazon', `search_amazon_${term}`),
                Markup.button.callback('🤝 ML', `search_ml_${term}`)
            ],
            [
                Markup.button.callback('🛍️ Shopee', `search_shopee_${term}`)
            ],
            [
                Markup.button.callback('⚖️ TODAS (Amazon + ML + Shopee)', `search_both_${term}`)
            ]
        ])
    });
});

// --- DISCOVERY CALLBACK HANDLERS ---

const askQuantity = async (ctx: any, url: string, platform: 'amazon' | 'ml' | 'shopee', description: string) => {
    userState.set(ctx.chat.id, {
        type: 'awaiting_quantity',
        url,
        platform,
        description
    });
    const platformName = platform === 'amazon' ? 'Amazon' : (platform === 'ml' ? 'Mercado Livre' : 'Shopee');
    await ctx.editMessageText(`🎯 **Certo! Vou buscar em ${platformName}**\n📍 ${description}\n\n🔢 **Quantos produtos você quer pegar?** (Digite um número de 1 a 50)`);
};

const showCurationMenu = async (ctx: any, url: string, platform: 'amazon' | 'ml' | 'shopee' | 'both', description: string) => {
    await ctx.editMessageText(`🔎 **Buscando e comparando...**\n📍 ${description}\n\nIsso pode levar alguns segundos...`);

    try {
        let resultsRaw: ProductListingItem[] = [];

        if (platform === 'both') {
            let amazonUrl = '', mlUrl = '';

            if (description.includes('Ofertas')) {
                amazonUrl = 'https://www.amazon.com.br/gp/goldbox';
                mlUrl = 'https://www.mercadolivre.com.br/ofertas';
            } else if (description.includes('Mais Vendidos')) {
                amazonUrl = 'https://www.amazon.com.br/gp/bestsellers';
                mlUrl = 'https://www.mercadolivre.com.br/mais-vendidos';
            } else {
                const term = description.replace('Busca por "', '').replace('"', '');
                const encodedTerm = encodeURIComponent(term);
                const amazonUrl = `https://www.amazon.com.br/s?k=${encodedTerm}`;
                const mlUrl = `https://lista.mercadolivre.com.br/${encodedTerm}`;
                const shopeeUrl = `https://shopee.com.br/search?keyword=${encodedTerm}`;

                console.log(`[BOTH] Buscando em 3 plataformas para: ${description}`);
                const [amazonResults, mlResults, shopeeResults] = await Promise.all([
                    scrapeDetailedListing(amazonUrl, 10),
                    scrapeDetailedListing(mlUrl, 10),
                    scrapeDetailedListing(shopeeUrl, 10)
                ]);

                // Adicionar flag de plataforma para saber de onde veio
                amazonResults.forEach(r => (r as any)._origin = 'amazon');
                mlResults.forEach(r => (r as any)._origin = 'ml');
                shopeeResults.forEach(r => (r as any)._origin = 'shopee');

                resultsRaw = [...amazonResults, ...mlResults, ...shopeeResults];
            }
        } else {
            resultsRaw = await scrapeDetailedListing(url, 20);
        }
        if (resultsRaw.length === 0) {
            return ctx.reply(`❌ Nenhum produto encontrado para: ${description}`);
        }

        // --- SMART CURATION LOGIC ---
        // 1. Pegar os 3 mais baratos
        const byPrice = [...resultsRaw].sort((a, b) => a.price - b.price);
        const cheapestItems = byPrice.slice(0, 3);

        // 2. Pegar os 3 mais "Populares" (baseado em reviews e sales)
        const byPopularity = [...resultsRaw].sort((a, b) => {
            // Se tiver sales ("1k+ bought"), damos peso
            const getSalesScore = (s: string) => {
                const m = s.match(/(\d+)/);
                if (!m) return 0;
                let val = parseInt(m[1]);
                if (s.toLowerCase().includes('k')) val *= 1000;
                if (s.toLowerCase().includes('mil')) val *= 1000;
                return val;
            };
            const sA = getSalesScore(a.sales) || (a.reviewsCount / 10);
            const sB = getSalesScore(b.sales) || (b.reviewsCount / 10);
            return sB - sA;
        });
        const popularItems = byPopularity.slice(0, 3);

        // 3. Mesclar e remover duplicatas, mantendo a ordem (Baratos primeiro, depois Populares)
        const results: ProductListingItem[] = [];
        const seenUrls = new Set<string>();

        [...cheapestItems, ...popularItems].forEach(item => {
            if (!seenUrls.has(item.url)) {
                results.push(item);
                seenUrls.add(item.url);
            }
        });

        // Garantir que não passamos de 6
        const finalResults = results.slice(0, 6);

        // Identificar destaques finais
        // Melhor preço absoluto (Garantido!)
        const absoluteCheapest = byPrice[0];

        // Mais popular (Baseado em sales/reviews)
        const absoluteMostPopular = byPopularity[0];

        (bot as any)._curationCache[ctx.chat.id] = finalResults;
        (bot as any)._curationPlatform[ctx.chat.id] = platform;

        userState.set(ctx.chat.id, {
            type: 'curation',
            results: finalResults,
            platform
        });

        let msg = `⚖️ **CURADORIA INTELIGENTE (${platform === 'both' ? 'AMBAS' : platform.toUpperCase()})**\n`;
        msg += `📍 _${description}_\n\n`;

        const keyboardLines: any[][] = [];

        finalResults.forEach((item, idx) => {
            let labels = [];
            if (item.url === absoluteCheapest.url) labels.push('💰 [O MELHOR PREÇO!]');
            if (item.url === absoluteMostPopular.url) labels.push('🔥 [MAIS VENDIDO]');

            const originTag = (item as any)._origin === 'amazon' ? '📦 ' : ((item as any)._origin === 'ml' ? '🤝 ' : '');
            const labelStr = labels.length > 0 ? `\n   ${labels.join(' ')}` : '';
            const salesStr = item.sales ? ` | ${item.sales}` : '';

            msg += `${idx + 1}. ${originTag}**${item.title.substring(0, 42)}...**\n`;
            msg += `   💵 R$ ${item.price.toFixed(2)} | ⭐ ${item.rating}${salesStr}${labelStr}\n\n`;

            const itemPlatform = (item as any)._origin || platform;
            keyboardLines.push([Markup.button.callback(`🚀 Gerar #${idx + 1}`, `curate_gen_${idx}`)]);
        });

        msg += `_Escolha entre os mais baratos ou os mais populares acima._`;

        await ctx.reply(msg, {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard(keyboardLines)
        });

    } catch (e: any) {
        await ctx.reply(`❌ Erro na curadoria: ${e.message}`);
    } finally {
        userState.delete(ctx.chat.id);
    }
};

const triggerCatalog = async (ctx: any, url: string, description: string, limit: number = 20) => {
    await ctx.reply(`🔎 **Buscando...**\n📍 ${description}\n📊 **Limite:** ${limit} itens\n\nIsso pode levar alguns segundos...`);

    try {
        const links = await scrapeLinksFromListing(url, limit);
        if (links.length === 0) {
            return ctx.reply(`❌ Nenhum produto encontrado em: ${description}`);
        }

        await ctx.reply(`✨ Encontrados ${links.length} itens. Começando a conversão...`);
        activeScans.add(ctx.chat.id);

        let count = 0;
        for (const productUrl of links) {
            if (!activeScans.has(ctx.chat.id)) break;
            if (processedLinks.has(productUrl)) continue;
            count++;
            console.log(`[CATALOG] [${count}/${links.length}] Processando...`);
            await processProduct(productUrl, ctx);
            await new Promise(r => setTimeout(r, 7000));
        }
        await ctx.reply(`🏁 Finalizado! (${count} novos produtos processados)`);
    } catch (e: any) {
        await ctx.reply(`❌ Erro na varredura: ${e.message}`);
    } finally {
        activeScans.delete(ctx.chat.id);
        userState.delete(ctx.chat.id);
    }
};

bot.action('find_deals_amazon', safeAction(async (ctx) => {
    await askQuantity(ctx, 'https://www.amazon.com.br/gp/goldbox', 'amazon', 'Amazon Ofertas Relâmpago');
}));

bot.action('find_deals_ml', safeAction(async (ctx) => {
    await askQuantity(ctx, 'https://www.mercadolivre.com.br/ofertas', 'ml', 'Mercado Livre Ofertas do Dia');
}));

bot.action('find_deals_both', safeAction(async (ctx) => {
    await showCurationMenu(ctx, '', 'both', 'Compare Ofertas do Dia');
}));

bot.action('find_best_amazon', safeAction(async (ctx) => {
    await askQuantity(ctx, 'https://www.amazon.com.br/gp/bestsellers', 'amazon', 'Amazon Mais Vendidos');
}));

bot.action('find_best_ml', safeAction(async (ctx) => {
    await askQuantity(ctx, 'https://www.mercadolivre.com.br/mais-vendidos', 'ml', 'Mercado Livre Mais Vendidos');
}));

bot.action('find_best_both', safeAction(async (ctx) => {
    await showCurationMenu(ctx, '', 'both', 'Compare Mais Vendidos');
}));

bot.action('find_deals_shopee', safeAction(async (ctx) => {
    await askQuantity(ctx, 'https://shopee.com.br/m/ofertas-do-dia', 'shopee', 'Shopee Ofertas do Dia');
}));

bot.action('find_best_shopee', safeAction(async (ctx) => {
    await askQuantity(ctx, 'https://shopee.com.br/m/best-sellers', 'shopee', 'Shopee Mais Vendidos');
}));

bot.action(/^search_(amazon|ml|shopee|both)_(.+)$/, safeAction(async (ctx) => {
    const platform = ctx.match[1] as 'amazon' | 'ml' | 'shopee' | 'both';
    const term = ctx.match[2];
    const encodedTerm = encodeURIComponent(term);

    let url = '';
    if (platform === 'amazon') url = `https://www.amazon.com.br/s?k=${encodedTerm}`;
    else if (platform === 'ml') url = `https://lista.mercadolivre.com.br/${encodedTerm}`;
    else if (platform === 'shopee') url = `https://shopee.com.br/search?keyword=${encodedTerm}`;

    await showCurationMenu(ctx, url, platform, `Busca por "${term}"`);
}));

// --- FIM DISCOVERY ---

// 1. Listen for catalog command
bot.command('catalog', async (ctx) => {
    const url = ctx.message.text.split(' ')[1];
    if (!url) return ctx.reply('Use: /catalog <url_do_catalogo>');

    userState.set(ctx.chat.id, {
        type: 'awaiting_catalog_quantity',
        url
    });

    await ctx.reply('🔢 **Quantos produtos deste catálogo você quer pegar?** (Digite um número de 1 a 50)');
});

// Global Error Handler to prevent process crash
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// 3. Listen for direct links
bot.on('text', async (ctx) => {
    const text = ctx.message.text;

    // AUTO-POST TOGGLE
    if (text === '/auto status') {
        return ctx.reply(`🤖 Modo Auto-Post: ${autoPost ? '✅ LIGADO' : '❌ DESLIGADO'}\nUse /auto on ou /auto off para alterar.`);
    }

    // STOP Command
    if (text === '/stop') {
        if (activeScans.has(ctx.chat.id)) {
            activeScans.delete(ctx.chat.id);
            return ctx.reply('⏳ Solicitando parada... O robô irá parar após terminar o item atual.');
        } else {
            return ctx.reply('❌ Nenhuma varredura de catálogo ativa no momento.');
        }
    }

    if (text === '/auto on') {
        autoPost = true;
        saveConfig();
        return ctx.reply('🚀 Auto-Post ATIVADO! Novos anúncios irão direto para o canal.');
    }
    if (text === '/auto off') {
        autoPost = false;
        saveConfig();
        return ctx.reply('✋ Auto-Post DESATIVADO. Agora você precisará clicar no botão para postar.');
    }

    if (text === '/restart') {
        await ctx.reply('🔄 Reciclando a vida... Volto em 2 segundos! 👋');
        console.log('[SYSTEM] Comando /restart recebido. Reiniciando...');
        process.exit(1); // O script start_bot.bat irá reiniciar
    }



    // 6. BATCH PROCESSING (Multi-line links)
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    // --- INTERACTIVE STATE HANDLER ---
    const state = userState.get(ctx.chat.id);
    if (state && !isNaN(Number(text))) {
        const qty = Math.min(Math.max(Number(text), 1), 50);

        if (state.type === 'awaiting_quantity') {
            return triggerCatalog(ctx, state.url!, state.description!, qty);
        }
        if (state.type === 'awaiting_catalog_quantity') {
            return triggerCatalog(ctx, state.url!, `Catálogo Manual`, qty);
        }
    }
    // --- END STATE HANDLER ---

    const validLinks = lines.filter(l =>
        l.includes('mercadolivre.com.br') ||
        l.includes('amazon.com.br') ||
        l.includes('amzn.to') ||
        l.includes('shopee.com.br')
    );

    if (validLinks.length > 1) {
        await ctx.reply(`📦 **Modo Lote Detectado!**\nRecebi ${validLinks.length} links. Processando um por um...`, { parse_mode: 'Markdown' });

        activeScans.add(ctx.chat.id); // Mark as active to allow /stop

        let count = 0;
        for (const link of validLinks) {
            // Check for cancellation
            if (!activeScans.has(ctx.chat.id)) {
                await ctx.reply('🛑 Processamento em lote interrompido.');
                break;
            }

            count++;
            await ctx.reply(`🔄 Processando ${count}/${validLinks.length}: ${link}`);

            // Extract clean URL from line
            const urlMatch = link.match(/https?:\/\/[^\s]+/);
            if (urlMatch) {
                await processProduct(urlMatch[0], ctx);
            } else {
                await ctx.reply(`⚠️ Link inválido na linha ${count}: ${link}`);
            }

            // Rate Limit Delay (10s)
            if (count < validLinks.length) {
                await new Promise(r => setTimeout(r, 10000));
            }
        }

        activeScans.delete(ctx.chat.id);
        await ctx.reply('✅ Processamento em lote finalizado!');
        return;
    }

    // 5. Detect Link and Auto-Detect Platform
    const urlMatch = text.match(/https?:\/\/[^\s]+/);
    if (urlMatch) {
        const url = urlMatch[0];
        console.log(`[DEBUG] Link detectado para auto-detecção: ${url}`);

        let detectedPlatform: 'amazon' | 'ml' | 'shopee' | null = null;
        if (url.includes('mercadolivre.com.br') || url.includes('mercado.livre')) {
            detectedPlatform = 'ml';
        } else if (url.includes('amazon.com.br') || url.includes('amazon.com') || url.includes('amzn.to')) {
            detectedPlatform = 'amazon';
        } else if (url.includes('shopee.com.br')) {
            detectedPlatform = 'shopee';
        }

        if (detectedPlatform) {
            console.log(`[AUTO] Loja detectada: ${detectedPlatform}`);
            const platformName = detectedPlatform === 'amazon' ? 'Amazon' : (detectedPlatform === 'ml' ? 'Mercado Livre' : 'Shopee');
            await ctx.reply(`🔄 **Processando ${platformName}:**\n🔗 ${url}`, { parse_mode: 'Markdown' });
            return await processProduct(url, ctx, detectedPlatform);
        }

        // Fallback for unidentified links
        userState.set(ctx.chat.id, {
            type: 'awaiting_platform',
            url
        });

        await ctx.reply('🛒 **Qual é a loja desse link?**\nNão consegui identificar a loja automaticamente.', {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [
                    Markup.button.callback('📦 Amazon', 'sel_amazon'),
                    Markup.button.callback('🤝 Mercado Livre', 'sel_ml'),
                    Markup.button.callback('🛍️ Shopee', 'sel_shopee')
                ]
            ])
        });
        return;
    } else {
        console.log(`[DEBUG] Texto ignorado (sem link).`);
    }
});


// Platform Selection Handlers
bot.action('sel_amazon', safeAction(async (ctx) => {
    const state = userState.get(ctx.chat?.id || 0);
    if (!state || !state.url) {
        await ctx.answerCbQuery('❌ Link expirou. Mande novamente.');
        return;
    }

    userState.delete(ctx.chat?.id || 0);
    await ctx.answerCbQuery('✅ Processando como Amazon...');
    await ctx.editMessageText(`📦 **Processando Amazon:**\n🔗 ${state.url}`);

    await processProduct(state.url, ctx, 'amazon');
}));

bot.action('sel_ml', safeAction(async (ctx) => {
    const state = userState.get(ctx.chat?.id || 0);
    if (!state || !state.url) {
        await ctx.answerCbQuery('❌ Link expirou. Mande novamente.');
        return;
    }

    userState.delete(ctx.chat?.id || 0);
    await ctx.answerCbQuery('✅ Processando como Mercado Livre...');
    await ctx.editMessageText(`🤝 **Processando Mercado Livre:**\n🔗 ${state.url}`);

    await processProduct(state.url, ctx, 'ml');
}));

bot.action('sel_shopee', safeAction(async (ctx) => {
    const state = userState.get(ctx.chat?.id || 0);
    if (!state || !state.url) {
        await ctx.answerCbQuery('❌ Link expirou. Mande novamente.');
        return;
    }

    userState.delete(ctx.chat?.id || 0);
    await ctx.answerCbQuery('✅ Processando como Shopee...');
    await ctx.editMessageText(`🛍️ **Processando Shopee:**\n🔗 ${state.url}`);

    await processProduct(state.url, ctx, 'shopee');
}));

// 4. Handle manual post button
bot.on('callback_query', safeAction(async (ctx: any) => {
    const data = ctx.callbackQuery.data;

    if (data.startsWith('post_')) {
        const ad = (bot as any)._adCache?.[data];
        if (!ad) {
            await ctx.answerCbQuery('❌ Anúncio expirou (bot reiniciado).');
            return;
        }

        console.log(`[MANUAL] Postando no canal...`);
        if (ad.image) {
            if (ad.image.startsWith('http')) {
                await bot.telegram.sendPhoto(channelId, ad.image, { caption: ad.adCopy });
            } else {
                const localPath = path.resolve(ad.image);
                if (fs.existsSync(localPath)) {
                    await bot.telegram.sendPhoto(channelId, Input.fromLocalFile(localPath), { caption: ad.adCopy });
                } else {
                    await bot.telegram.sendMessage(channelId, `[Imagem indisponível] \n\n${ad.adCopy}`);
                }
            }
        } else {
            await bot.telegram.sendMessage(channelId, ad.adCopy);
        }
        await ctx.answerCbQuery('✅ Postado com sucesso!');
        await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
        return;
    }

    if (data.startsWith('curate_gen_')) {
        const idx = parseInt(data.replace('curate_gen_', ''));
        const results = (bot as any)._curationCache?.[ctx.chat.id];
        let platform = (bot as any)._curationPlatform?.[ctx.chat.id];

        if (!results || !results[idx]) {
            await ctx.answerCbQuery('❌ Resultados expiraram. Faça a busca novamente.');
            return;
        }

        const item = results[idx];
        // Se a busca original foi 'both', pegamos a plataforma de origem do item
        if (platform === 'both' && (item as any)._origin) {
            platform = (item as any)._origin;
        }

        await ctx.answerCbQuery(`⌛ Gerando anúncio de "${item.title.substring(0, 15)}..."`);
        await processProduct(item.url, ctx, platform === 'both' ? undefined : platform);
    }
}));

// 5. Help Command & Startup


// Start Bot
console.log('🚀 Telegram Bot iniciado!');
console.log(`Canal Alvo: ${channelId}`);
bot.launch().catch(err => {
    if (err.message.includes('409: Conflict')) {
        console.error('❌ ERRO DE CONFLITO: O robô já está rodando em outra janela ou terminal.');
        console.error('🛠️ Feche todas as janelas do robô e tente novamente.');
    } else {
        console.error('❌ Erro ao iniciar robô:', err.message);
    }
    process.exit(1);
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));


// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
