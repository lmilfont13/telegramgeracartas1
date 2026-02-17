const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// FORCE USE OF ANON KEY
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing env vars");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log("Testing access with ANONYMOUS KEY...");

    // Try to read bots
    const { data: bots, error: botsError } = await supabase.from('bots').select('*');

    if (botsError) console.error("Error reading bots:", botsError.message);
    else console.log(`Bots found: ${bots.length}`);

    // Try to read companies
    const { data: companies, error: compError } = await supabase.from('empresas').select('*');

    if (compError) console.error("Error reading companies:", compError.message);
    else console.log(`Companies found: ${companies.length}`);
}

check();
