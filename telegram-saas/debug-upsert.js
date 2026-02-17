const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function debugUpsert() {
    const empresaId = '693dd2d3-271d-4f53-8f6e-375bdb3d21a9'; // ID da Empresa Teste
    console.log("--- TESTANDO UPSERT EM TEMPLATES ---");

    // Tenta primeiro um select para ver as colunas
    const { data: cols, error: colError } = await supabase.from('templates').select('*').limit(1);
    if (colError) {
        console.error("Erro ao listar colunas:", colError);
    } else {
        console.log("Exemplo de linha/colunas:", cols);
    }

    const { data, error } = await supabase
        .from('templates')
        .upsert({
            empresa_id: empresaId,
            texto: 'Teste de template via script',
            nome: 'Padrão'
        }, { onConflict: 'empresa_id' });

    if (error) {
        console.error("Erro no UPSERT:", JSON.stringify(error, null, 2));
    } else {
        console.log("Sucesso no UPSERT!");
    }
}

debugUpsert();
