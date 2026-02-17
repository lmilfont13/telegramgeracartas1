const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function deleteTestBot() {
    console.log("🔍 Procurando 'Bot Teste Script'...");

    const { data: bots, error: fetchError } = await supabase
        .from('bots')
        .select('id, nome')
        .ilike('nome', '%Bot Teste Script%');

    if (fetchError) {
        console.error("❌ Erro ao buscar bots:", fetchError);
        return;
    }

    if (!bots || bots.length === 0) {
        console.log("⚠️ Bot não encontrado.");
        return;
    }

    for (const bot of bots) {
        console.log(`🗑️ Deletando bot: ${bot.nome} (${bot.id})`);
        const { error: deleteError } = await supabase
            .from('bots')
            .delete()
            .eq('id', bot.id);

        if (deleteError) {
            console.error(`❌ Erro ao deletar ${bot.nome}:`, deleteError);
        } else {
            console.log(`✅ ${bot.nome} deletado com sucesso.`);
        }
    }
}

deleteTestBot();
