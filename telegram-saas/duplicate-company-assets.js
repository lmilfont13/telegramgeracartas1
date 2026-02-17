const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// IDs obtidos anteriormente
const SOURCE_COMPANY_ID = '693dd2d3-271d-4f53-8f6e-375bdb3d21a9'; // POP TRADE
const TARGET_COMPANY_ID = '751bc117-ac7f-4f1d-9681-8c6aff94bd2e'; // Tarhget

async function syncAssets() {
    console.log(`🚀 Sincronizando Assets (Logo/Carimbos)...`);

    // 1. Buscar assets da origem
    const { data: source, error: fetchError } = await supabase
        .from('empresas')
        .select('logo_url, carimbo_url, carimbo_funcionario_url')
        .eq('id', SOURCE_COMPANY_ID)
        .single();

    if (fetchError) {
        console.error("❌ Erro ao buscar empresa de origem:", fetchError);
        return;
    }

    console.log(`📋 Assets encontrados:`, source);

    // 2. Atualizar destino
    const { error: updateError } = await supabase
        .from('empresas')
        .update({
            logo_url: source.logo_url,
            carimbo_url: source.carimbo_url,
            carimbo_funcionario_url: source.carimbo_funcionario_url
        })
        .eq('id', TARGET_COMPANY_ID);

    if (updateError) {
        console.error(`❌ Erro ao atualizar empresa de destino:`, updateError);
    } else {
        console.log(`🎉 Assets sincronizados para Tarhget com sucesso!`);
    }
}

syncAssets();
