'use server'

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

export async function uploadCompanyLogo(formData: FormData) {
    const supabase = await createClient()
    const empresaId = formData.get('empresa_id') as string
    const file = formData.get('logo') as File

    if (!file || file.size === 0) return { error: 'Nenhum arquivo.' }
    console.log(`[Server] Recebido arquivo: ${file.name}, Tamanho: ${file.size} bytes`)

    try {
        const { data: { user } } = await supabase.auth.getUser()
        console.log(`[UploadLogo] User: ${user?.id || 'ANONYMOUS'}, Empresa: ${empresaId}`)

        const fileExt = file.name.split('.').pop()
        const fileName = `${empresaId}/logo.${fileExt}`

        console.log(`[UploadLogo] Uploading to storage: ${fileName}`)
        const { error: uploadError } = await supabase.storage
            .from('logos')
            .upload(fileName, file, { upsert: true })

        if (uploadError) {
            console.error('[UploadLogo] Erro no Storage:', uploadError)
            return { error: 'Erro no Storage: ' + uploadError.message }
        }

        const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(fileName)
        console.log(`[UploadLogo] Public URL: ${publicUrl}`)

        const { error: dbError } = await supabase.from('empresas').update({ logo_url: publicUrl }).eq('id', empresaId)

        if (dbError) {
            console.error('[UploadLogo] Erro no Banco:', dbError.message, dbError.details, dbError.hint)
            return { error: `Erro ao salvar no banco: ${dbError.message}` }
        }

        console.log('[UploadLogo] Sucesso!')
        revalidatePath(`/empresa/${empresaId}`)
        return { success: 'Logo salva!' }
    } catch (e: any) {
        console.error('[UploadLogo] Exceção:', e)
        return { error: e.message }
    }
}

export async function uploadCompanyCarimbo(formData: FormData) {
    const supabase = await createClient()
    const empresaId = formData.get('empresa_id') as string
    const file = formData.get('carimbo') as File

    if (!file || file.size === 0) return { error: 'Nenhum arquivo.' }
    console.log(`[Server] Recebido arquivo: ${file.name}, Tamanho: ${file.size} bytes`)

    try {
        const { data: { user } } = await supabase.auth.getUser()
        console.log(`[UploadCarimbo] User: ${user?.id || 'ANONYMOUS'}, Empresa: ${empresaId}`)

        const fileExt = file.name.split('.').pop()
        const fileName = `${empresaId}/carimbo.${fileExt}`

        const { error: uploadError } = await supabase.storage
            .from('carimbos')
            .upload(fileName, file, { upsert: true })

        if (uploadError) {
            console.error('[UploadCarimbo] Erro no Storage:', uploadError)
            return { error: 'Erro no Storage: ' + uploadError.message }
        }

        const { data: { publicUrl } } = supabase.storage.from('carimbos').getPublicUrl(fileName)

        const { error: dbError } = await supabase.from('empresas').update({ carimbo_url: publicUrl }).eq('id', empresaId)

        if (dbError) {
            console.error('[UploadCarimbo] Erro no Banco:', dbError.message, dbError.details, dbError.hint)
            return { error: `Erro ao salvar no banco: ${dbError.message}` }
        }

        revalidatePath(`/empresa/${empresaId}`)
        return { success: 'Carimbo salvo!' }
    } catch (e: any) {
        console.error('[UploadCarimbo] Exceção:', e)
        return { error: e.message }
    }
}

export async function uploadCompanyCarimboFuncionario(formData: FormData) {
    const supabase = await createClient()
    const empresaId = formData.get('empresa_id') as string
    const file = formData.get('carimbo_funcionario') as File

    if (!file || file.size === 0) return { error: 'Nenhum arquivo.' }
    console.log(`[Server] Recebido arquivo: ${file.name}, Tamanho: ${file.size} bytes`)

    try {
        const { data: { user } } = await supabase.auth.getUser()
        console.log(`[UploadCarimboFunc] User: ${user?.id || 'ANONYMOUS'}, Empresa: ${empresaId}`)

        const fileExt = file.name.split('.').pop()
        const fileName = `${empresaId}/carimbo_funcionario.${fileExt}`

        const { error: uploadError } = await supabase.storage
            .from('carimbos')
            .upload(fileName, file, { upsert: true })

        if (uploadError) {
            console.error('[UploadCarimboFunc] Erro no Storage:', uploadError)
            return { error: 'Erro no Storage: ' + uploadError.message }
        }

        const { data: { publicUrl } } = supabase.storage.from('carimbos').getPublicUrl(fileName)

        const { error: dbError } = await supabase.from('empresas').update({ carimbo_funcionario_url: publicUrl }).eq('id', empresaId)

        if (dbError) {
            console.error('[UploadCarimboFunc] Erro no Banco:', dbError.message, dbError.details, dbError.hint)
            return { error: `Erro ao salvar no banco: ${dbError.message}` }
        }

        revalidatePath(`/empresa/${empresaId}`)
        return { success: 'Assinatura salva!' }
    } catch (e: any) {
        console.error('[UploadCarimboFunc] Exceção:', e)
        return { error: e.message }
    }
}

export async function clearCompanyAsset(formData: FormData) {
    const supabase = await createClient()
    const empresaId = formData.get('empresa_id') as string
    const field = formData.get('field') as string

    if (!empresaId || !field) return { error: 'Dados insuficientes.' }

    try {
        console.log(`[ClearAsset] Limpando ${field} de ${empresaId}`)
        const { error } = await supabase
            .from('empresas')
            .update({ [field]: null })
            .eq('id', empresaId)

        if (error) throw error

        revalidatePath(`/empresa/${empresaId}`)
        return { success: 'Removido!' }
    } catch (e: any) {
        console.error('[ClearAsset] Erro:', e)
        return { error: e.message }
    }
}

export async function saveTemplate(formData: FormData) {
    const supabase = await createClient()
    const id = formData.get('id') as string
    const empresaId = formData.get('empresa_id') as string
    const nome = formData.get('nome') as string
    const conteudo = formData.get('conteudo') as string

    if (!empresaId || !nome || !conteudo) return { error: 'Dados incompletos.' }

    try {
        let error;
        if (id) {
            // Update
            const { error: err } = await supabase
                .from('templates')
                .update({ nome, conteudo })
                .eq('id', id)
            error = err
        } else {
            // Create
            const { error: err } = await supabase
                .from('templates')
                .insert({ empresa_id: empresaId, nome, conteudo })
            error = err
        }

        if (error) throw error

        revalidatePath(`/empresa/${empresaId}/templates`)
        return { success: 'Template salvo!' }
    } catch (e: any) {
        console.error('[SaveTemplate] Erro:', e)
        return { error: e.message }
    }
}

export async function deleteTemplate(formData: FormData) {
    const supabase = await createClient()
    const id = formData.get('id') as string
    const empresaId = formData.get('empresa_id') as string

    if (!id) return { error: 'ID não fornecido.' }

    try {
        const { error } = await supabase
            .from('templates')
            .delete()
            .eq('id', id)

        if (error) throw error

        revalidatePath(`/empresa/${empresaId}/templates`)
        return { success: 'Template removido!' }
    } catch (e: any) {
        console.error('[DeleteTemplate] Erro:', e)
        return { error: e.message }
    }
}

export async function updateCompanyLojas(formData: FormData) {
    const supabase = await createClient()
    const empresaId = formData.get('empresa_id') as string
    const lojasJson = formData.get('lojas') as string

    if (!empresaId) return { error: 'ID da empresa não fornecido.' }

    try {
        const lojas = JSON.parse(lojasJson)
        const { error } = await supabase
            .from('empresas')
            .update({ lojas: lojas })
            .eq('id', empresaId)

        if (error) throw error

        revalidatePath(`/empresa/${empresaId}`)
        return { success: 'Lista de lojas atualizada!' }
    } catch (e: any) {
        console.error('[UpdateLojas] Erro:', e)
        return { error: 'Erro ao salvar lojas: ' + e.message }
    }
}
