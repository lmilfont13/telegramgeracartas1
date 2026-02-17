const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const TARGET_ID = '751bc117-ac7f-4f1d-9681-8c6aff94bd2e';

async function verifyStorage() {
    console.log("🔍 Verificando Storage para Tarhget (ID: 751bc117-ac7f-4f1d-9681-8c6aff94bd2e)...");

    const { data: logos, error: e1 } = await supabase.storage.from('logos').list(TARGET_ID);
    console.log("Logos em Tarhget:", logos || e1);

    const { data: carimbos, error: e2 } = await supabase.storage.from('carimbos').list(TARGET_ID);
    console.log("Carimbos em Tarhget:", carimbos || e2);

    const { data: emp } = await supabase.from('empresas').select('*').eq('id', TARGET_ID).single();
    console.log("Status no Banco:", {
        logo: emp?.logo_url,
        carimbo: emp?.carimbo_url,
        carimbo_func: emp?.carimbo_funcionario_url
    });
}

verifyStorage();
