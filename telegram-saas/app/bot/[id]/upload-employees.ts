'use server'

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"
import * as XLSX from 'xlsx';

export async function uploadEmployees(formData: FormData) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { return { error: 'Usuário não logado.' } }

    const botId = formData.get('bot_id') as string
    const file = formData.get('file') as File
    const mappingJson = formData.get('mapping') as string // Novo: JSON com o mapeamento

    let customMapping: Record<string, string> | null = null;
    if (mappingJson) {
        try {
            customMapping = JSON.parse(mappingJson);
        } catch (e) {
            console.error("Erro ao parsear mapeamento:", e);
        }
    }

    if (!file) {
        return { error: 'Nenhum arquivo enviado.' }
    }

    // Buscar empresa do bot
    const { data: bot } = await supabase.from('bots').select('empresa_id').eq('id', botId).single()
    if (!bot) return { error: 'Bot não encontrado.' }

    try {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet);

        if (jsonData.length === 0) {
            return { error: 'Planilha vazia.' }
        }

        // Mapear colunas (tentativa de encontrar nomes parecidos)
        // Esperado: NOME, LOJA, DATA (admissão), CARGO

        const funcionarios = jsonData.map((row: any) => {
            // Normaliza chaves para facilitar busca (remove acentos e espaços extras)
            const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

            const keys = Object.keys(row).reduce((acc, key) => {
                let value = row[key];

                // Tratar notação científica ou números que devem ser strings (RG/CPF)
                if (typeof value === 'number') {
                    // Se for um número muito grande (provavelmente RG ou CPF), converte para string sem notação científica
                    if (value > 1000000) {
                        value = value.toLocaleString('fullwide', { useGrouping: false });
                    } else {
                        value = String(value);
                    }
                }

                acc[normalize(key)] = value;
                return acc;
            }, {} as any);

            // Mapeamento de campos
            let nome, loja, cargo, dataAdmissaoRaw;

            if (customMapping) {
                // Usa o mapeamento manual do usuário
                nome = row[customMapping['nome']] || 'Sem Nome';
                loja = row[customMapping['loja']] || '';
                cargo = row[customMapping['cargo']] || '';
                dataAdmissaoRaw = row[customMapping['data_admissao']];
            } else {
                // Fallback para mapeamento automático fuzzy
                nome = keys['nome'] || keys['funcionario'] || keys['candidato'] || keys['promotor'] || keys['colaborador'] || keys['nome do funcionario'] || keys['nome completo'] || 'Sem Nome';
                loja = keys['loja'] || keys['unidade'] || keys['filial'] || keys['ponto de venda'] || keys['pdv'] || '';
                cargo = keys['cargo'] || keys['funcao'] || keys['ocupacao'] || '';
                dataAdmissaoRaw = keys['data'] || keys['admissao'] || keys['data admissao'] || keys['data de admissao'] || keys['inicio'] || keys['data de inicio'];
            }

            // Converter Data
            let dataAdmissao = null;
            if (dataAdmissaoRaw) {
                if (typeof dataAdmissaoRaw === 'number') {
                    // Converter serial excel para Date JS
                    // (Excel serial date starts from 1900-01-01)
                    // Aproximação simples:
                    const date = new Date((dataAdmissaoRaw - 25569) * 86400 * 1000);
                    dataAdmissao = date.toISOString().split('T')[0];
                } else {
                    // Tenta parsear string PT-BR (DD/MM/YYYY)
                    if (typeof dataAdmissaoRaw === 'string' && dataAdmissaoRaw.includes('/')) {
                        const parts = dataAdmissaoRaw.split('/');
                        if (parts.length === 3) {
                            dataAdmissao = `${parts[2]}-${parts[1]}-${parts[0]}`;
                        }
                    } else {
                        // Tenta ISO direto
                        try {
                            dataAdmissao = new Date(dataAdmissaoRaw).toISOString().split('T')[0];
                        } catch (e) {
                            console.error("Erro data:", e);
                        }
                    }
                }
            }

            // Dados extras (tudo que sobrou)
            const dadosExtras = { ...row }; // Salva tudo como extra por garantia

            return {
                empresa_id: bot.empresa_id,
                nome: String(nome),
                loja: String(loja),
                cargo: String(cargo),
                data_admissao: dataAdmissao, // pode ser null
                dados_extras: dadosExtras
            };
        });

        // Inserir no banco
        // Opção: Limpar anteriores? O usuário pode querer.
        // Por enquanto, vamos apenas inserir (append).
        // Mas se o usuário subir a mesma planilha 2x, duplica.
        // Vamos tentar um UPSERT baseado em (empresa_id, nome)?
        // Não temos constraint unique no nome.

        // Vamos deletar todos dessa empresa antes? Perigoso.
        // Vamos apenas inserir. O usuário gerencia.

        const { error: insertError } = await supabase.from('funcionarios').insert(funcionarios);

        if (insertError) {
            console.error("Erro insert:", insertError);
            return { error: 'Erro ao salvar no banco: ' + insertError.message }
        }

        revalidatePath(`/bot/${botId}`);
        return { success: `${funcionarios.length} funcionários importados!` };

    } catch (e: any) {
        console.error("Erro upload:", e);
        return { error: 'Erro ao processar arquivo: ' + e.message }
    }
}

export async function deleteAllEmployees(botId: string) {
    const supabase = await createClient()

    // Buscar empresa do bot
    const { data: bot } = await supabase.from('bots').select('empresa_id').eq('id', botId).single()
    if (!bot) return { error: 'Bot não encontrado.' }

    const { error } = await supabase
        .from('funcionarios')
        .delete()
        .eq('empresa_id', bot.empresa_id)

    if (error) return { error: error.message }

    revalidatePath(`/bot/${botId}`)
    revalidatePath(`/empresa/${bot.empresa_id}`)
    return { success: 'Todos os funcionários foram removidos.' }
}
