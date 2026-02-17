const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://bunnclexcjutrltuybam.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1bm5jbGV4Y2p1dHJsdHV5YmFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMDQ3OTUsImV4cCI6MjA4Njc4MDc5NX0.zCdmX5a7IsEFn0scFo_6e10-kPHeDGHOaiBzC_O4Ulk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    console.log("Teste de Criação de Bot via Script Direto");

    // Usuário fake definido no app/page.tsx
    const user = { id: '00000000-0000-0000-0000-000000000000', email: 'admin@saas.com' };

    // 1. Tentar criar empresa
    console.log("Tentando criar empresa...");

    // Precisamos de um nome único para evitar conflito se a constraint exigir
    // Mas schema.sql diz UNIQUE(email_responsavel)? Não, UNIQUE(auth_user_id) talvez?
    // Verificando.

    // Vamos tentar buscar primeiro
    let { data: existingEmpresa } = await supabase.from('empresas').select('id').eq('auth_user_id', user.id).maybeSingle();
    let empresaId = existingEmpresa ? existingEmpresa.id : null;

    if (!empresaId) {
        const { data: novaEmpresa, error: empresaError } = await supabase.from('empresas').insert({
            nome: 'Empresa Teste Script',
            email_responsavel: user.email,
            auth_user_id: user.id
        }).select().single();

        if (empresaError) {
            console.error("ERRO AO CRIAR EMPRESA:", empresaError);
            return;
        }
        console.log("Empresa criada:", novaEmpresa);
        empresaId = novaEmpresa.id;
    } else {
        console.log("Empresa já existe:", empresaId);
    }

    // 2. Tentar criar bot
    console.log("Tentando criar bot...");
    const randomToken = "TOKEN_TESTE_" + Math.floor(Math.random() * 10000);

    const { data: bot, error: botError } = await supabase.from('bots').insert({
        empresa_id: empresaId,
        nome: 'Bot Teste Script',
        token_telegram: randomToken
    }).select().single();

    if (botError) {
        console.error("ERRO AO CRIAR BOT:", botError);
    } else {
        console.log("BOT CRIADO COM SUCESSO!", bot);
    }
}

test();
