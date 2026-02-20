const fetch = require('node-fetch');

async function checkTags() {
    const url = 'https://telegramgeracartas1.vercel.app/bot/360a6e68-0064-4696-b35e-4ce4127d58ba';
    console.log('Checking URL:', url);
    try {
        const res = await fetch(url);
        const text = await res.text();
        console.log('Page length:', text.length);

        const hasPlaceholderTitle = text.includes('Variáveis Disponíveis');
        const hasNomePlaceholder = text.includes('{{NOME}}');

        console.log('Has "Variáveis Disponíveis":', hasPlaceholderTitle);
        console.log('Has "{{NOME}}":', hasNomePlaceholder);

        if (!hasPlaceholderTitle) {
            console.log('Dica: O texto "Variáveis Disponíveis" não foi encontrado. O deploy pode não ter concluído ou o link está errado.');
        }
    } catch (e) {
        console.error('Error fetching:', e);
    }
}

checkTags();
