const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDashboardTables() {
    const tables = ['bots', 'empresas', 'templates', 'cartas_geradas', 'funcionarios'];
    console.log("=== CHECKING DASHBOARD TABLES ===\n");

    for (const table of tables) {
        const { data, count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
        if (error) {
            console.log(`❌ Table '${table}': ERROR - ${error.message}`);
        } else {
            console.log(`✅ Table '${table}': EXISTS - ${count} rows`);
        }
    }
}

checkDashboardTables();
