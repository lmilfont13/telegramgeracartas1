const { Client } = require('pg');

const senha = encodeURIComponent('lmg1975BR13@');
const connectionStringDirect = `postgres://postgres:${senha}@db.bunnclexcjutrltuybam.supabase.co:5432/postgres`;

console.log("Conectando ao banco para DESATIVAR RLS...");

const client = new Client({
    connectionString: connectionStringDirect,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        await client.connect();

        // 1. Criar um usuário FAKE na tabela auth.users para garantir que os foreign keys funcionem?
        // Não, auth_user_id é UUID. Se eu usar um UUID fixo, as FKs (se houver constraints) podem reclamar.
        // 'empresas.auth_user_id' referencia 'auth.users.id'?
        // Verificando schema.sql (passo 1558)... Sim: "auth_user_id UUID REFERENCES auth.users(id)".
        // Então PRECISO que esse usuário exista em auth.users.

        // Vou tentar inserir um usuário fake 'admin_sem_senha' se não existir.
        const fakeUuid = '00000000-0000-0000-0000-000000000000';

        try {
            await client.query(`
            INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, aud, role)
            VALUES ($1, 'admin@saas.com', 'fake', now(), 'authenticated', 'authenticated')
            ON CONFLICT (id) DO NOTHING;
        `, [fakeUuid]);
            console.log("Usuário ADMIN criado/verificado.");
        } catch (e) {
            console.log("Aviso: Falha ao criar usuário fake (talvez permissão):", e.message);
        }

        // 2. Desativar RLS nas tabelas
        await client.query("ALTER TABLE empresas DISABLE ROW LEVEL SECURITY;");
        await client.query("ALTER TABLE bots DISABLE ROW LEVEL SECURITY;");
        await client.query("ALTER TABLE templates DISABLE ROW LEVEL SECURITY;");
        // await client.query("ALTER TABLE carimbos DISABLE ROW LEVEL SECURITY;"); // Se existir

        // 3. Garantir permissões públicas (ANON)
        // Se RLS está disabled, qualquer um com a chave anon (API) pode ler/escrever SE tiver GRANT.
        // O role 'anon' precisa de GRANT ALL.
        await client.query("GRANT ALL ON TABLE empresas TO anon;");
        await client.query("GRANT ALL ON TABLE bots TO anon;");
        await client.query("GRANT ALL ON TABLE templates TO anon;");
        await client.query("GRANT ALL ON TABLE empresas TO service_role;"); // Garantia
        await client.query("GRANT ALL ON TABLE bots TO service_role;");
        await client.query("GRANT ALL ON TABLE templates TO service_role;");

        console.log("SUCESSO: Segurança do banco removida. Acesso liberado.");

    } catch (err) {
        console.error("ERRO AO EXECUTAR:", err);
    } finally {
        await client.end();
    }
}

run();
