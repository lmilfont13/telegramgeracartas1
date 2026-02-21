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

        console.log("Adicionando coluna lojas (JSONB)...");
        await client.query("ALTER TABLE empresas ADD COLUMN IF NOT EXISTS lojas JSONB DEFAULT '[]'::jsonb;");
        console.log("✅ lojas adicionada!");

        console.log("\n🎉 SUCESSO! A coluna foi adicionada.");

    } catch (err) {
        console.error("ERRO:", err.message);
    } finally {
        await client.end();
    }
}

run();
