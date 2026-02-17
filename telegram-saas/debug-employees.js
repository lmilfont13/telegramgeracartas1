const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugCompanyEmployees() {
    console.log("🔍 Iniiciando diagnóstico de Empresas e Funcionários...");

    // 1. Listar todas as empresas
    const { data: empresas, error: errEmp } = await supabase
        .from('empresas')
        .select('id, nome');

    if (errEmp) {
        console.error("❌ Erro ao listar empresas:", errEmp);
        return;
    }

    console.log(`\n🏢 Empresas encontradas: ${empresas.length}`);
    empresas.forEach(e => console.log(` - [${e.id}] ${e.nome}`));

    // 2. Para cada empresa, contar funcionários
    for (const emp of empresas) {
        const { count, error: errCount } = await supabase
            .from('funcionarios')
            .select('*', { count: 'exact', head: true })
            .eq('empresa_id', emp.id);

        if (errCount) console.error(`❌ Erro ao contar func da empresa ${emp.nome}:`, errCount);
        else console.log(`   👥 Funcionários em ${emp.nome}: ${count}`);

        // 3. Tentar buscar um funcionário específico dessa empresa (teste de amostra)
        if (count > 0) {
            const { data: sample } = await supabase
                .from('funcionarios')
                .select('nome')
                .eq('empresa_id', emp.id)
                .limit(3);
            console.log(`      Exemplos: ${sample.map(s => s.nome).join(', ')}`);
        }
    }
}

debugCompanyEmployees();
