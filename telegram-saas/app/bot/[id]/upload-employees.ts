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
                acc[normalize(key)] = row[key];
                return acc;
            }, {} as any);

            // Tenta encontrar campos com vários sinônimos
            const nome = keys['nome'] || keys['funcionario'] || keys['colaborador'] || keys['nome do funcionario'] || keys['nome completo'] || Object.values(row)[0] || 'Sem Nome';
            const loja = keys['loja'] || keys['unidade'] || keys['filial'] || keys['ponto de venda'] || keys['pdv'] || '';
            const cargo = keys['cargo'] || keys['funcao'] || keys['ocupacao'] || '';

            // Data
            let dataAdmissao = null;
            let rawData = keys['data'] || keys['admissao'] || keys['data admissao'] || keys['data de admissao'] || keys['inicio'];

            if (rawData) {
                if (typeof rawData === 'number') {
                    // Converter serial excel para Date JS
                    // (Excel serial date starts from 1900-01-01)
                    // Aproximação simples:
                    const date = new Date((rawData - 25569) * 86400 * 1000);
                    dataAdmissao = date.toISOString().split('T')[0];
                } else {
                    // Tenta parsear string PT-BR (DD/MM/YYYY)
                    if (typeof rawData === 'string' && rawData.includes('/')) {
                        const parts = rawData.split('/');
                        if (parts.length === 3) {
                            dataAdmissao = `${parts[2]}-${parts[1]}-${parts[0]}`;
                        }
                    } else {
                        // Tenta ISO direto
                        dataAdmissao = new Date(rawData).toISOString().split('T')[0];
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
