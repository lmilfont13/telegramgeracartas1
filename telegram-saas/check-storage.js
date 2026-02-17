const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Variáveis de ambiente faltando.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStorage() {
    console.log("🔍 Verificando buckets de storage...");
    const { data: buckets, error } = await supabase.storage.listBuckets();

    if (error) {
        console.error("❌ Erro ao listar buckets:", error.message);
        return;
    }

    console.log("Buckets encontrados:");
    buckets.forEach(b => {
        console.log(`- ${b.name} (Público: ${b.public})`);
    });

    for (const b of buckets) {
        console.log(`\n📄 Conteúdo do bucket '${b.name}':`);
        const { data: files, error: filesError } = await supabase.storage.from(b.name).list('', { limit: 10 });
        if (filesError) {
            console.error(`  ❌ Erro ao listar arquivos em ${b.name}:`, filesError.message);
        } else {
            files.forEach(f => {
                console.log(`  - ${f.name} (${f.metadata?.size || 0} bytes)`);
            });
        }
    }
}

checkStorage();
