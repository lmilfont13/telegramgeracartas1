const { Client } = require('pg');

const senha = encodeURIComponent('lmg1975BR13@');
const connectionString = `postgres://postgres:${senha}@db.bunnclexcjutrltuybam.supabase.co:5432/postgres`;

const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        await client.connect();
        console.log("Conectado ao banco!");

        console.log("\n🔓 Desativando RLS na tabela funcionarios...");
        await client.query("ALTER TABLE funcionarios DISABLE ROW LEVEL SECURITY;");
        console.log("✅ RLS desativado!");

        console.log("\n🔑 Garantindo permissões públicas...");
        await client.query("GRANT ALL ON TABLE funcionarios TO anon;");
        await client.query("GRANT ALL ON TABLE funcionarios TO service_role;");
        console.log("✅ Permissões concedidas!");

        console.log("\n🎉 SUCESSO! Agora você pode importar funcionários.");

    } catch (err) {
        console.error("ERRO:", err.message);
    } finally {
        await client.end();
    }
}

run();
