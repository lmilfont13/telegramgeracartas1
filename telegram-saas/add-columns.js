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

        console.log("Adicionando coluna logo_url...");
        await client.query("ALTER TABLE empresas ADD COLUMN IF NOT EXISTS logo_url TEXT;");
        console.log("✅ logo_url adicionada!");

        console.log("Adicionando coluna carimbo_url...");
        await client.query("ALTER TABLE empresas ADD COLUMN IF NOT EXISTS carimbo_url TEXT;");
        console.log("✅ carimbo_url adicionada!");

        console.log("Adicionando coluna carimbo_funcionario_url...");
        await client.query("ALTER TABLE empresas ADD COLUMN IF NOT EXISTS carimbo_funcionario_url TEXT;");
        console.log("✅ carimbo_funcionario_url adicionada!");

        console.log("\n🎉 SUCESSO! Todas as colunas foram adicionadas.");

    } catch (err) {
        console.error("ERRO:", err.message);
    } finally {
        await client.end();
    }
}

run();
