const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugImagesWithClient() {
    const { data: empresas, error } = await supabase.from('empresas').select('*');
    if (error) {
        console.error("Erro ao buscar empresas:", error);
        return;
    }

    for (const emp of empresas) {
        console.log(`\n🏢 Empresa: ${emp.nome}`);

        const testImages = [
            { label: 'Logo', bucket: 'logos', url: emp.logo_url },
            { label: 'Carimbo 1', bucket: 'carimbos', url: emp.carimbo_url },
            { label: 'Carimbo 2', bucket: 'carimbos', url: emp.carimbo_funcionario_url }
        ];

        for (const img of testImages) {
            if (!img.url) {
                console.log(`   🔸 ${img.label}: Sem URL`);
                continue;
            }

            // Teste 1: Fetch Direto
            try {
                const resp = await fetch(img.url);
                console.log(`   ${resp.ok ? '✅' : '❌'} ${img.label} Fetch: ${resp.status} ${resp.statusText}`);
            } catch (e) {
                console.log(`   ❌ ${img.label} Fetch: ERRO ${e.message}`);
            }

            // Teste 2: Download via Client (Bucket + Path)
            try {
                // Tenta extrair o path do URL público
                // URL: https://.../storage/v1/object/public/bucket/path/to/file.png
                const urlParts = img.url.split('/public/');
                if (urlParts.length > 1) {
                    const fullPath = urlParts[1];
                    const bucket = fullPath.split('/')[0];
                    const path = fullPath.substring(bucket.length + 1);

                    console.log(`      Tentando Bucket: [${bucket}], Path: [${path}]`);

                    const { data, error: dlError } = await supabase.storage.from(bucket).download(path);
                    if (dlError) {
                        console.log(`      ❌ Download Client Error: ${dlError.message}`);
                    } else {
                        console.log(`      ✅ Download Client Sucesso! Size: ${data.size} bytes`);
                    }
                } else {
                    console.log(`      ❌ Não foi possível extrair bucket/path do URL: ${img.url}`);
                }
            } catch (e) {
                console.log(`      ❌ Erro no teste do Client: ${e.message}`);
            }
        }
    }
}

debugImagesWithClient();
