const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function dump() {
    console.log("--- EMPRESAS ---");
    const { data: e, error: ee } = await supabase.from('empresas').select('*');
    if (ee) console.error(ee);
    else console.log(JSON.stringify(e, null, 2));

    console.log("\n--- BOTS ---");
    const { data: b, error: be } = await supabase.from('bots').select('*');
    if (be) console.error(be);
    else console.log(JSON.stringify(b, null, 2));

    process.exit(0);
}

dump();
