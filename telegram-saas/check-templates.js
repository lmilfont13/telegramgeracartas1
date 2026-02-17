const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkTemplates() {
    console.log("--- BUSCANDO TEMPLATES ---");
    const { data, error } = await supabase.from('templates').select('*');
    if (error) {
        console.error("Erro ao buscar templates:", error);
    } else {
        console.log("Templates encontrados:", JSON.stringify(data, null, 2));
    }
}

checkTemplates();
