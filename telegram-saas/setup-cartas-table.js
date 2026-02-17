const { Client } = require('pg');

const senha = encodeURIComponent('lmg1975BR13@');
const connectionStringDirect = `postgres://postgres:${senha}@db.bunnclexcjutrltuybam.supabase.co:5432/postgres`;

const client = new Client({
    connectionString: connectionStringDirect,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        await client.connect();

        console.log("Criando tabela cartas_geradas...");
        await client.query(`
            CREATE TABLE IF NOT EXISTS cartas_geradas (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                bot_id UUID REFERENCES bots(id) ON DELETE CASCADE,
                empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
                funcionario_id UUID REFERENCES funcionarios(id) ON DELETE SET NULL,
                template_id UUID REFERENCES templates(id) ON DELETE SET NULL,
                nome_arquivo TEXT NOT NULL,
                url_storage TEXT,
                nome_funcionario TEXT,
                data_geracao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        `);

        await client.query("ALTER TABLE cartas_geradas ENABLE ROW LEVEL SECURITY;");
        await client.query("DROP POLICY IF EXISTS \"Public Access\" ON cartas_geradas;");
        await client.query("CREATE POLICY \"Public Access\" ON cartas_geradas FOR ALL USING (true);");
        await client.query("GRANT ALL ON TABLE cartas_geradas TO anon;");
        await client.query("GRANT ALL ON TABLE cartas_geradas TO service_role;");

        console.log("SUCESSO: Tabela cartas_geradas criada e permissões configuradas.");

    } catch (err) {
        console.error("ERRO AO EXECUTAR:", err);
    } finally {
        await client.end();
    }
}

run();
