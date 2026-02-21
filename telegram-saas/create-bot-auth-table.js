const { Client } = require('pg');
const fs = require('fs');

if (fs.existsSync('.env.local')) {
    require('dotenv').config({ path: '.env.local' });
}

const senha = encodeURIComponent('lmg1975BR13@');
const connectionString = `postgres://postgres:${senha}@db.bunnclexcjutrltuybam.supabase.co:5432/postgres`;

async function createTable() {
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log("Connected to database.");

        const query = `
            CREATE TABLE IF NOT EXISTS bot_auth (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                chat_id TEXT NOT NULL,
                bot_id UUID REFERENCES bots(id) ON DELETE CASCADE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                UNIQUE(chat_id, bot_id)
            );
        `;

        await client.query(query);
        console.log("Table 'bot_auth' created successfully.");

    } catch (err) {
        console.error("Error creating table:", err);
    } finally {
        await client.end();
    }
}

createTable();
