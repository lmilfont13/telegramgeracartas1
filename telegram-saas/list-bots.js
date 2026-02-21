const { createClient } = require('@supabase/supabase-js');
if (require('fs').existsSync('.env.local')) {
    require('dotenv').config({ path: '.env.local' });
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkBots() {
    const { data: bots, error } = await supabase.from('bots').select('*');
    if (error) console.error(error);
    else console.log(JSON.stringify(bots, null, 2));
}

checkBots();
