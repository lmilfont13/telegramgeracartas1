const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://bunnclexcjutrltuybam.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1bm5jbGV4Y2p1dHJsdHV5YmFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMDQ3OTUsImV4cCI6MjA4Njc4MDc5NX0.zCdmX5a7IsEFn0scFo_6e10-kPHeDGHOaiBzC_O4Ulk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
    console.log("=== VERIFICANDO DADOS NO BANCO ===\n");

    // 1. Verificar Empresas e Carimbos
    console.log("📋 EMPRESAS E CARIMBOS:");
    const { data: empresas } = await supabase.from('empresas').select('*');

    if (empresas && empresas.length > 0) {
        empresas.forEach(emp => {
            console.log(`\n  Empresa: ${emp.nome}`);
            console.log(`  Logo: ${emp.logo_url ? '✅ SIM' : '❌ NÃO'}`);
            if (emp.logo_url) console.log(`    URL: ${emp.logo_url}`);
            console.log(`  Carimbo Empresa: ${emp.carimbo_url ? '✅ SIM' : '❌ NÃO'}`);
            if (emp.carimbo_url) console.log(`    URL: ${emp.carimbo_url}`);
            console.log(`  Carimbo Funcionário: ${emp.carimbo_funcionario_url ? '✅ SIM' : '❌ NÃO'}`);
            if (emp.carimbo_funcionario_url) console.log(`    URL: ${emp.carimbo_funcionario_url}`);
        });
    } else {
        console.log("  ❌ Nenhuma empresa encontrada");
    }

    // 2. Verificar Funcionários
    console.log("\n\n👥 FUNCIONÁRIOS:");
    const { data: funcionarios } = await supabase
        .from('funcionarios')
        .select('*')
        .limit(10);

    if (funcionarios && funcionarios.length > 0) {
        console.log(`  ✅ Total: ${funcionarios.length} funcionários\n`);
        funcionarios.forEach((f, i) => {
            console.log(`  ${i + 1}. ${f.nome}`);
            console.log(`     Loja: ${f.loja || 'N/A'}`);
            console.log(`     Cargo: ${f.cargo || 'N/A'}`);
            console.log(`     Admissão: ${f.data_admissao || 'N/A'}`);
        });
    } else {
        console.log("  ❌ Nenhum funcionário encontrado");
    }

    console.log("\n\n=== FIM DA VERIFICAÇÃO ===");
}

checkData();
