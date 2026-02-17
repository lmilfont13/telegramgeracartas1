const axios = require('axios');

const urls = [
    'https://bunnclexcjutrltuybam.supabase.co/storage/v1/object/public/logos/693dd2d3-271d-4f53-8f6e-375bdb3d21a9/logo.png',
    'https://bunnclexcjutrltuybam.supabase.co/storage/v1/object/public/carimbos/693dd2d3-271d-4f53-8f6e-375bdb3d21a9/carimbo.png'
];

async function testImages() {
    for (const url of urls) {
        console.log(`Testando URL: ${url}`);
        try {
            const res = await axios.get(url, { responseType: 'arraybuffer' });
            console.log(`✅ SUCESSO! Status: ${res.statusCode || 200}, Tamanho: ${res.data.length} bytes`);
        } catch (err) {
            console.error(`❌ FALHA! Status: ${err.response?.status || '???'}`);
            if (err.response?.data) {
                try {
                    console.error(`Erro Body: ${err.response.data.toString()}`);
                } catch (e) { }
            }
        }
    }
}

testImages();
