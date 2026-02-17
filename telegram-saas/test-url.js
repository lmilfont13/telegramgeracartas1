const http = require('http');

const url = 'http://localhost:3000/bot/360a6e68-0064-4696-b35e-4ce4127d58ba';

http.get(url, (res) => {
    console.log(`Status Code: ${res.statusCode}`);
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        console.log(`Body length: ${data.length}`);
        if (data.includes('Configurações')) {
            console.log('Sucesso: Encontrou "Configurações" no corpo.');
        } else {
            console.log('Aviso: Não encontrou "Configurações".');
            console.log('Snippet do corpo:', data.substring(0, 500));
        }
    });
}).on('error', (err) => {
    console.error(`Erro: ${err.message}`);
});
