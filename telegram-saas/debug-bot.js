const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log("=== Debugging Bot Data ===");

    // 1. Get company
    const { data: empresas } = await supabase.from('empresas').select('*');
    console.log("Empresas:", empresas.map(e => ({ id: e.id, nome: e.nome })));

    if (empresas.length > 0) {
        const empId = empresas[0].id;

        // 2. Get Template
        const { data: template } = await supabase.from('templates').select('*').eq('empresa_id', empId).maybeSingle();
        console.log("Template:", template ? (template.texto ? "✅ Tem texto" : "❌ Texto Vazio") : "❌ Não encontrado");
        if (template && template.texto) console.log("Conteúdo do Template (primeiros 50 chars):", template.texto.substring(0, 50));

        // 3. Check Employees
        const { data: employees } = await supabase.from('funcionarios').select('*').eq('empresa_id', empId).limit(5);
        console.log("Funcionários (Top 5):", employees.map(f => f.nome));
    }
}
check();
