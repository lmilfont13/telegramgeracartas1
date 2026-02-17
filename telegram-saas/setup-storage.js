const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupStorage() {
    console.log("🛠️ Iniciando configuração de storage...");

    const buckets = ['logos', 'carimbos'];

    for (const name of buckets) {
        console.log(`\n📦 Verificando bucket: ${name}`);
        const { data: bucket, error: getError } = await supabase.storage.getBucket(name);

        if (getError) {
            console.log(`  ➕ Criando bucket '${name}'...`);
            const { data: newBucket, error: createError } = await supabase.storage.createBucket(name, {
                public: true
            });
            if (createError) {
                console.error(`  ❌ Erro ao criar bucket:`, createError.message);
                console.log(`  💡 Dica: Verifique se você tem permissões ou crie o bucket '${name}' manualmente como PÚBLICO no painel do Supabase.`);
            } else {
                console.log(`  ✅ Bucket '${name}' criado com sucesso.`);
            }
        } else {
            console.log(`  ✅ Bucket '${name}' já existe. (Público: ${bucket.public})`);
            if (!bucket.public) {
                console.log(`  🔄 Alterando bucket '${name}' para PÚBLICO...`);
                const { error: updateError } = await supabase.storage.updateBucket(name, { public: true });
                if (updateError) console.error(`  ❌ Erro ao atualizar bucket:`, updateError.message);
                else console.log(`  ✅ Bucket '${name}' agora é público.`);
            }
        }
    }
}

setupStorage();
