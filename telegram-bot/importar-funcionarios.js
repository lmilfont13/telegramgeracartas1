const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

/**
 * Script para importar funcionários de planilha Excel/CSV para funcionarios.json
 * 
 * Uso:
 * node importar-funcionarios.js caminho/para/planilha.xlsx
 * 
 * A planilha deve ter as seguintes colunas (ordem não importa):
 * - Nome
 * - Cargo
 * - Empresa
 * - Telefone
 * - Email
 * - Cidade
 * - RG (opcional)
 * - CPF (opcional)
 * - Matricula (opcional)
 * - Numero_Carteira (opcional)
 * - Serie (opcional)
 */

function importarFuncionarios(arquivoPlanilha) {
    try {
        console.log('📊 Lendo planilha:', arquivoPlanilha);

        // Ler arquivo Excel/CSV
        const workbook = XLSX.readFile(arquivoPlanilha);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Converter para JSON
        const dados = XLSX.utils.sheet_to_json(worksheet);

        console.log(`✅ ${dados.length} linhas encontradas`);

        // Mapear dados para formato do funcionarios.json
        const funcionarios = dados.map((linha, index) => {
            // Normalizar nomes das colunas (remover espaços, converter para minúsculas)
            const normalizado = {};
            Object.keys(linha).forEach(key => {
                const keyNormalizada = key.toLowerCase().trim().replace(/\s+/g, '_');
                normalizado[keyNormalizada] = linha[key];
            });

            // Criar objeto funcionário
            const funcionario = {
                nome: normalizado.nome || normalizado.name || normalizado.candidato || `Funcionário ${index + 1}`,
                cargo: normalizado.cargo || normalizado.position || 'Não especificado',
                empresa: normalizado.empresa || normalizado.company || 'Não especificado',
                telefone: normalizado.telefone || normalizado.phone || normalizado.tel || '',
                email: normalizado.email || normalizado.e_mail || '',
                cidade: normalizado.cidade || normalizado.city || normalizado.local || normalizado.endereço_funcional || ''
            };

            // Adicionar campos opcionais se existirem
            if (normalizado.rg) funcionario.rg = String(normalizado.rg);
            if (normalizado.cpf) funcionario.cpf = String(normalizado.cpf);
            if (normalizado.matricula || normalizado.matrícula) {
                funcionario.matricula = String(normalizado.matricula || normalizado.matrícula);
            }
            if (normalizado.número_carteira_profissional || normalizado.numero_carteira || normalizado.ctps) {
                funcionario.numero_carteira = String(normalizado.número_carteira_profissional || normalizado.numero_carteira || normalizado.ctps);
            }
            if (normalizado.série_carteira_profissional || normalizado.serie || normalizado.série) {
                funcionario.serie = String(normalizado.série_carteira_profissional || normalizado.serie || normalizado.série);
            }

            return funcionario;
        });

        // Criar objeto final
        const dadosFinais = {
            funcionarios: funcionarios
        };

        // Salvar em funcionarios.json
        const caminhoSaida = path.join(__dirname, 'funcionarios.json');
        fs.writeFileSync(caminhoSaida, JSON.stringify(dadosFinais, null, 2), 'utf8');

        console.log(`\n✅ Importação concluída!`);
        console.log(`📁 Arquivo salvo: ${caminhoSaida}`);
        console.log(`👥 Total de funcionários: ${funcionarios.length}`);

        // Mostrar preview dos primeiros 3
        console.log('\n📋 Preview dos primeiros funcionários:');
        funcionarios.slice(0, 3).forEach((f, i) => {
            console.log(`\n${i + 1}. ${f.nome}`);
            console.log(`   Cargo: ${f.cargo}`);
            console.log(`   Empresa: ${f.empresa}`);
            if (f.cpf) console.log(`   CPF: ${f.cpf}`);
            if (f.rg) console.log(`   RG: ${f.rg}`);
        });

        if (funcionarios.length > 3) {
            console.log(`\n... e mais ${funcionarios.length - 3} funcionários.`);
        }

        console.log('\n🔄 Reinicie o bot para carregar os novos dados!');

    } catch (error) {
        console.error('❌ Erro ao importar planilha:', error.message);
        console.error('\n💡 Certifique-se de que:');
        console.error('   1. O arquivo existe');
        console.error('   2. É um arquivo Excel (.xlsx, .xls) ou CSV (.csv)');
        console.error('   3. Possui as colunas necessárias (Nome, Cargo, Empresa, etc.)');
        process.exit(1);
    }
}

// Verificar argumentos
const args = process.argv.slice(2);

if (args.length === 0) {
    console.log('❌ Uso: node importar-funcionarios.js <caminho-para-planilha>');
    console.log('\nExemplo:');
    console.log('  node importar-funcionarios.js funcionarios.xlsx');
    console.log('  node importar-funcionarios.js dados/lista.csv');
    process.exit(1);
}

const arquivoPlanilha = args[0];

// Verificar se arquivo existe
if (!fs.existsSync(arquivoPlanilha)) {
    console.error(`❌ Arquivo não encontrado: ${arquivoPlanilha}`);
    process.exit(1);
}

// Executar importação
importarFuncionarios(arquivoPlanilha);
