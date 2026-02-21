'use server'

import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

export async function createBot(formData: FormData) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { error: 'Não autorizado' }
    }

    // 1. Verifica/Cria a Empresa do Usuário
    // (Num sistema real, o usuário criaria a empresa explicitamente.
    // Aqui vamos simplificar: 1 Usuário = 1 Empresa)
    let { data: empresa } = await supabase
        .from('empresas')
        .select('id')
        .eq('auth_user_id', user.id)
        .single()

    if (!empresa) {
        const { data: newEmpresa, error: empresaError } = await supabase
            .from('empresas')
            .insert({
                nome: 'Minha Empresa',
                email_responsavel: user.email,
                auth_user_id: user.id
            })
            .select()
            .single()

        if (empresaError) {
            console.error('Erro ao criar empresa:', empresaError)
            return { error: 'Erro ao criar empresa.' }
        }
        empresa = newEmpresa
    }

    // 2. Cria o Bot
    const nomeBot = formData.get('nome') as string
    const tokenBot = formData.get('token') as string

    if (!empresa) {
        return { error: 'Empresa não encontrada.' }
    }

    const { error: botError } = await supabase
        .from('bots')
        .insert({
            empresa_id: empresa.id,
            nome: nomeBot,
            token_telegram: tokenBot
        })

    if (botError) {
        console.error('Erro ao criar bot:', botError)
        // Tratamento básico de erro de duplicidade de token
        if (botError.code === '23505') {
            return { error: 'Este token já está em uso.' }
        }
        return { error: 'Erro ao salvar bot.' }
    }

    // Redireciona para atualizar a lista
    revalidatePath('/')
    redirect('/')
}

export async function renameTemplate(id: string, newName: string) {
    const supabase = await createClient()
    const { error } = await supabase
        .from('templates')
        .update({ nome: newName })
        .eq('id', id)

    if (error) {
        console.error('Erro ao renomear template:', error)
        return { error: 'Erro ao renomear.' }
    }
    revalidatePath('/')
    return { success: true }
}

export async function deleteTemplate(id: string) {
    const supabase = await createClient()
    const { error } = await supabase
        .from('templates')
        .delete()
        .eq('id', id)

    if (error) {
        console.error('Erro ao excluir template:', error)
        return { error: 'Erro ao excluir.' }
    }
    revalidatePath('/')
    return { success: true }
}

export async function createTemplate(formData: FormData) {
    const supabase = await createClient()
    const nome = formData.get('nome') as string
    const empresaId = formData.get('empresa_id') as string | null
    const conteudo = "Olá {{NOME}}, seu texto aqui..."

    // Se veio um ID de empresa específico, usa ele
    if (empresaId) {
        const { error } = await supabase
            .from('templates')
            .insert({
                empresa_id: empresaId,
                nome: nome,
                conteudo: conteudo
            })

        if (error) {
            console.error('Erro ao criar template:', error)
            return { error: 'Erro ao criar.' }
        }
    } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { error: 'Não autorizado' };

        const { data: empresa } = await supabase
            .from('empresas')
            .select('id')
            .eq('auth_user_id', user.id)
            .single()

        // Se não achar empresa vinculada ao user e nem veio ID, cria como "Geral" (null) ou erro?
        // Vamos permitir criar com empresa_id NULL (Geral) se não achar
        const finalEmpresaId = empresa ? empresa.id : null;

        const { error } = await supabase
            .from('templates')
            .insert({
                empresa_id: finalEmpresaId,
                nome: nome,
                conteudo: conteudo
            })

        if (error) {
            console.error('Erro ao criar template:', error)
            return { error: 'Erro ao criar.' }
        }
    }

    revalidatePath('/')
    return { success: true }
}

export async function updateTemplateContent(id: string, content: string) {
    const supabase = await createClient()
    const { error } = await supabase
        .from('templates')
        .update({ conteudo: content })
        .eq('id', id)

    if (error) {
        console.error('Erro ao atualizar conteúdo do template:', error)
        return { error: 'Erro ao salvar conteúdo.' }
    }
    revalidatePath('/')
    return { success: true }
}

export async function createEmpresa(formData: FormData) {
    const supabase = await createClient()
    const nome = formData.get('nome') as string

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Não autorizado' };

    console.log("[CreateEmpresa] Iniciando criação:", nome);

    const { data: newEmpresa, error } = await supabase
        .from('empresas')
        .insert({
            nome: nome,
            email_responsavel: user.email
            // auth_user_id: user.id 
        })
        .select()
        .single() // .single() pode falhar se não retornar linha ou retornar múltiplas

    if (error) {
        console.error('[CreateEmpresa] Erro Supabase:', error)
        return { error: error.message || 'Erro ao criar empresa.' } // Retorna mensagem detalhada
    }

    if (!newEmpresa) {
        console.error('[CreateEmpresa] Sucesso mas sem dados retornados.');
        return { error: 'Empresa criada mas dados não retornados.' }
    }

    console.log("[CreateEmpresa] Sucesso:", newEmpresa.id);
    revalidatePath('/')
    return { success: true, id: newEmpresa.id }
}

export async function deleteLetter(id: string, pdfUrl?: string) {
    const supabase = await createClient()

    // 1. Se houver URL, deleta do storage
    if (pdfUrl) {
        try {
            const path = pdfUrl.split('/public/cartas/')[1]
            if (path) {
                await supabase.storage.from('cartas').remove([path])
            }
        } catch (e) {
            console.error('Erro ao deletar arquivo físico:', e)
        }
    }

    // 2. Deleta do banco
    const { error } = await supabase.from('cartas_geradas').delete().eq('id', id)

    if (error) {
        console.error('Erro ao excluir carta:', error)
        return { error: 'Erro ao excluir do banco.' }
    }

    revalidatePath('/')
    return { success: true }
}

export async function deleteEmpresa(id: string) {
    const supabase = await createClient()

    // IMPORTANTE: Idealmente verificar se há bots ou funcionários vinculados
    const { error } = await supabase
        .from('empresas')
        .delete()
        .eq('id', id)

    if (error) {
        console.error('Erro ao excluir empresa:', error)
        return { error: 'Erro ao excluir. Verifique se há bots ligados a ela.' }
    }

    revalidatePath('/')
    return { success: true }
}
