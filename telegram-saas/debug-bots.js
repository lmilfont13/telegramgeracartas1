const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://bunnclexcjutrltuybam.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1bm5jbGV4Y2p1dHJsdHV5YmFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMDQ3OTUsImV4cCI6MjA4Njc4MDc5NX0.zCdmX5a7IsEFn0scFo_6e10-kPHeDGHOaiBzC_O4Ulk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugBots() {
    console.log("=== DEBUG: Listando TODOS os bots ===");

    const { data: allBots, error } = await supabase
        .from('bots')
        .select('*')
        .order('criado_em', { ascending: false });

    if (error) {
        console.error("ERRO ao buscar bots:", error);
    } else {
        console.log(`Total de bots no banco: ${allBots.length}`);
        allBots.forEach(bot => {
            console.log(`- ID: ${bot.id}`);
            console.log(`  Nome: ${bot.nome}`);
            console.log(`  Empresa ID: ${bot.empresa_id}`);
            console.log(`  Token: ${bot.token_telegram.substring(0, 20)}...`);
            console.log(`  Ativo: ${bot.ativo}`);
            console.log('');
        });
    }

    console.log("=== DEBUG: Listando TODAS as empresas ===");
    const { data: empresas } = await supabase.from('empresas').select('*');
    console.log(`Total de empresas: ${empresas?.length || 0}`);
    empresas?.forEach(emp => {
        console.log(`- Empresa: ${emp.nome} (ID: ${emp.id})`);
        console.log(`  Auth User ID: ${emp.auth_user_id}`);
        console.log('');
    });
}

debugBots();
