const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function listEverything() {
    console.log("--- BUCKET: logos ---");
    const { data: logos, error: err1 } = await supabase.storage.from('logos').list('', { recursive: true });
    console.log(logos?.map(l => l.name));

    console.log("\n--- BUCKET: carimbos ---");
    const { data: carimbos, error: err2 } = await supabase.storage.from('carimbos').list('', { recursive: true });
    console.log(carimbos?.map(c => c.name));
}

listEverything();
