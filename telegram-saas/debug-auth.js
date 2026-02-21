const { Client } = require('pg');

const senha = encodeURIComponent('lmg1975BR13@');
const connectionString = `postgres://postgres:${senha}@db.bunnclexcjutrltuybam.supabase.co:5432/postgres`;

async function checkAuth() {
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log("Connected to database.");

        const res = await client.query("SELECT * FROM bot_auth");
        console.log("Records in 'bot_auth':", res.rows);

        const bots = await client.query("SELECT id, nome FROM bots");
        console.log("Bots available:", bots.rows);

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await client.end();
    }
}

checkAuth();
