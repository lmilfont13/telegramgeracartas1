const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// IDs obtidos do debug anterior
const SOURCE_COMPANY_ID = '693dd2d3-271d-4f53-8f6e-375bdb3d21a9'; // POP TRADE
const TARGET_COMPANY_ID = '751bc117-ac7f-4f1d-9681-8c6aff94bd2e'; // Tarhget

async function duplicateEmployees() {
    console.log(`🚀 Iniciando duplicação de funcionários...`);
    console.log(`FROM: ${SOURCE_COMPANY_ID}`);
    console.log(`TO:   ${TARGET_COMPANY_ID}`);

    // 1. Buscar funcionários da origem
    const { data: sourceEmployees, error: fetchError } = await supabase
        .from('funcionarios')
        .select('*')
        .eq('empresa_id', SOURCE_COMPANY_ID);

    if (fetchError) {
        console.error("❌ Erro ao buscar funcionários:", fetchError);
        return;
    }

    if (!sourceEmployees || sourceEmployees.length === 0) {
        console.log("⚠️ Nenhum funcionário encontrado na empresa de origem.");
        return;
    }

    console.log(`📋 Encontrados ${sourceEmployees.length} funcionários para copiar.`);

    // 2. Preparar dados para inserção
    const newEmployees = sourceEmployees.map(emp => {
        // Remove ID e datas para gerar novos
        const { id, criado_em, ...rest } = emp;
        return {
            ...rest,
            empresa_id: TARGET_COMPANY_ID // Troca o ID da empresa
        };
    });

    // 3. Inserir em lotes (para evitar payload muito grande)
    const BATCH_SIZE = 50;
    let insertedCount = 0;

    for (let i = 0; i < newEmployees.length; i += BATCH_SIZE) {
        const batch = newEmployees.slice(i, i + BATCH_SIZE);
        const { error: insertError } = await supabase
            .from('funcionarios')
            .insert(batch);

        if (insertError) {
            console.error(`❌ Erro ao inserir lote ${i}:`, insertError);
        } else {
            insertedCount += batch.length;
            console.log(`✅ Inseridos ${insertedCount} / ${newEmployees.length}`);
        }
    }

    console.log(`🎉 Processo finalizado! Total duplicados: ${insertedCount}`);
}

duplicateEmployees();
