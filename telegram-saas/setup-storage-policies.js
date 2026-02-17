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

        console.log("\n📦 Configurando políticas de Storage...\n");

        // Bucket: logos
        console.log("Criando políticas para bucket 'logos'...");

        await client.query(`
      CREATE POLICY "Permitir upload de logos"
      ON storage.objects FOR INSERT
      TO public
      WITH CHECK (bucket_id = 'logos');
    `);
        console.log("✅ Política de INSERT criada para logos");

        await client.query(`
      CREATE POLICY "Permitir leitura pública de logos"
      ON storage.objects FOR SELECT
      TO public
      USING (bucket_id = 'logos');
    `);
        console.log("✅ Política de SELECT criada para logos");

        await client.query(`
      CREATE POLICY "Permitir atualização de logos"
      ON storage.objects FOR UPDATE
      TO public
      USING (bucket_id = 'logos');
    `);
        console.log("✅ Política de UPDATE criada para logos");

        // Bucket: carimbos
        console.log("\nCriando políticas para bucket 'carimbos'...");

        await client.query(`
      CREATE POLICY "Permitir upload de carimbos"
      ON storage.objects FOR INSERT
      TO public
      WITH CHECK (bucket_id = 'carimbos');
    `);
        console.log("✅ Política de INSERT criada para carimbos");

        await client.query(`
      CREATE POLICY "Permitir leitura pública de carimbos"
      ON storage.objects FOR SELECT
      TO public
      USING (bucket_id = 'carimbos');
    `);
        console.log("✅ Política de SELECT criada para carimbos");

        await client.query(`
      CREATE POLICY "Permitir atualização de carimbos"
      ON storage.objects FOR UPDATE
      TO public
      USING (bucket_id = 'carimbos');
    `);
        console.log("✅ Política de UPDATE criada para carimbos");

        console.log("\n🎉 SUCESSO! Todas as políticas de Storage foram criadas.");
        console.log("Agora você pode fazer upload de imagens!");

    } catch (err) {
        console.error("ERRO:", err.message);
        if (err.message.includes('already exists')) {
            console.log("\n⚠️ Algumas políticas já existiam. Isso é normal!");
        }
    } finally {
        await client.end();
    }
}

run();
