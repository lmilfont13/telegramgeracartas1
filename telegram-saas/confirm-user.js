// Script para confirmar um usuário manualmente no banco de dados (bypass de e-mail)
// Rode com: node confirm-user.js seu-email@exemplo.com

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Você vai precisar da Service Role para mexer na Auth

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("❌ Erro: Variáveis NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY necessárias no .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

const email = process.argv[2];

if (!email) {
    console.error("❌ Por favor, informe o e-mail: node confirm-user.js email@exemplo.com");
    process.exit(1);
}

async function confirmUser() {
    console.log(`🔍 Buscando usuário com e-mail: ${email}...`);

    // Como não podemos dar UPDATE direto na auth.users via Client sem SQL, 
    // vamos usar a API de Admin do Supabase se a Service Key estiver lá.
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
        console.error("❌ Erro ao listar usuários:", listError.message);
        return;
    }

    const user = users.find(u => u.email === email);

    if (!user) {
        console.error("❌ Usuário não encontrado! Certifique-se de que clicou em 'Sign Up' na tela de login primeiro.");
        return;
    }

    console.log(`✅ Usuário encontrado (ID: ${user.id}). Confirmando...`);

    const { data, error } = await supabase.auth.admin.updateUserById(
        user.id,
        { email_confirm: true }
    );

    if (error) {
        console.error("❌ Erro ao confirmar:", error.message);
    } else {
        console.log(`🚀 SUCESSO! O usuário ${email} agora está confirmado e pode fazer login.`);
    }
}

confirmUser();
