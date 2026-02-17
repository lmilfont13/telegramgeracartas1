const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function listAll() {
    const { data: empresas, error } = await supabase
        .from('empresas')
        .select('id, nome, logo_url, carimbo_url, carimbo_funcionario_url');

    if (error) {
        console.error("Erro:", error);
    } else {
        console.log("ALL COMPANIES:", empresas);
    }
}

listAll();
