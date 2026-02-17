const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const POP_ID = '693dd2d3-271d-4f53-8f6e-375bdb3d21a9';

async function run() {
    console.log("Checking POP TRADE Storage (Should NOT be empty):");

    const { data: logos, error: e1 } = await supabase.storage.from('logos').list(POP_ID);
    console.log("Logos POP:", logos || e1);

    const { data: carimbos, error: e2 } = await supabase.storage.from('carimbos').list(POP_ID);
    console.log("Carimbos POP:", carimbos || e2);

    const { data: lists } = await supabase.storage.from('logos').list();
    console.log("Root Logos List:", lists);
}

run();
