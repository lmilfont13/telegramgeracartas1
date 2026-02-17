const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://bunnclexcjutrltuybam.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1bm5jbGV4Y2p1dHJsdHV5YmFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMDQ3OTUsImV4cCI6MjA4Njc4MDc5NX0.zCdmX5a7IsEFn0scFo_6e10-kPHeDGHOaiBzC_O4Ulk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkFuncionarios() {
    console.log("=== Verificando Funcionários no Banco ===\n");

    const { data: funcionarios, error } = await supabase
        .from('funcionarios')
        .select('*')
        .order('criado_em', { ascending: false })
        .limit(10);

    if (error) {
        console.error("ERRO ao buscar funcionários:", error);
        return;
    }

    if (!funcionarios || funcionarios.length === 0) {
        console.log("❌ NENHUM funcionário encontrado no banco!");
        console.log("\nVocê precisa importar a planilha na tela de 'Configurar' do bot.");
        return;
    }

    console.log(`✅ Total de funcionários: ${funcionarios.length}\n`);

    funcionarios.forEach((f, index) => {
        console.log(`${index + 1}. ${f.nome}`);
        console.log(`   Loja: ${f.loja || 'N/A'}`);
        console.log(`   Cargo: ${f.cargo || 'N/A'}`);
        console.log(`   Data Admissão: ${f.data_admissao || 'N/A'}`);
        console.log(`   Empresa ID: ${f.empresa_id}`);
        console.log('');
    });
}

checkFuncionarios();
