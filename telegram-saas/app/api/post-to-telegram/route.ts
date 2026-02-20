import { NextRequest, NextResponse } from 'next/server';
import TelegramBot from 'node-telegram-bot-api';

const botToken = process.env.TELEGRAM_BOT_TOKEN;
const channelId = process.env.TELEGRAM_CHANNEL_ID;

export async function POST(req: NextRequest) {
    try {
        if (!botToken || !channelId) {
            return NextResponse.json({ error: 'Telegram Bot Token ou Channel ID não configurados' }, { status: 500 });
        }

        const { adCopy, image } = await req.json();

        if (!adCopy) {
            return NextResponse.json({ error: 'Conteúdo do anúncio é obrigatório' }, { status: 400 });
        }

        const bot = new TelegramBot(botToken);

        console.log(`[SaaS-API] Postando no canal: ${channelId}`);

        if (image) {
            await bot.sendPhoto(channelId, image, { caption: adCopy });
        } else {
            await bot.sendMessage(channelId, adCopy);
        }

        return NextResponse.json({ success: true, message: 'Postado com sucesso no canal!' });

    } catch (error: any) {
        console.error('Error posting to Telegram:', error);
        return NextResponse.json({ error: 'Erro ao postar no Telegram: ' + error.message }, { status: 500 });
    }
}
