const TelegramBot = require('node-telegram-bot-api');
if (require('fs').existsSync('.env.local')) {
    require('dotenv').config({ path: '.env.local' });
}

const token = "8408674502:AAEUl5vNGbQGTC9vUGrJsyjao7uJEIwyi6s"; // From list-bots.js

async function resetBot() {
    const bot = new TelegramBot(token);
    try {
        console.log("Setting temporary webhook to stop polling on other instances...");
        await bot.setWebHook("https://example.com/webhook-dummy");

        console.log("Waiting 3 seconds...");
        await new Promise(r => setTimeout(r, 3000));

        console.log("Deleting webhook to allow polling again...");
        await bot.deleteWebHook();

        console.log("✅ Bot session reset successfully.");
    } catch (e) {
        console.error("❌ Error resetting bot:", e.message);
    }
}

resetBot();
