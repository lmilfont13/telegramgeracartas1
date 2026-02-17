'use server'

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

export async function uploadLogo(formData: FormData) {
    const supabase = await createClient()

    const botId = formData.get('bot_id') as string
    const file = formData.get('logo') as File

    if (!file || file.size === 0) {
        return { error: 'Nenhum arquivo selecionado.' }
    }

    try {
        const { data: bot } = await supabase.from('bots').select('empresa_id').eq('id', botId).single()
        if (!bot) return { error: 'Bot não encontrado.' }

        const fileExt = file.name.split('.').pop()
        const fileName = `${bot.empresa_id}/logo.${fileExt}`

        const { error: uploadError } = await supabase.storage
            .from('logos')
            .upload(fileName, file, { upsert: true })

        if (uploadError) {
            console.error('Erro upload:', uploadError)
            return { error: 'Erro ao fazer upload: ' + uploadError.message }
        }

        const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(fileName)

        const { error: updateError } = await supabase
            .from('empresas')
            .update({ logo_url: publicUrl })
            .eq('id', bot.empresa_id)

        if (updateError) {
            return { error: 'Erro ao salvar no banco.' }
        }

        revalidatePath(`/bot/${botId}`)
        return { success: 'Logo atualizada!' }

    } catch (e: any) {
        return { error: e.message }
    }
}

export async function uploadCarimbo(formData: FormData) {
    const supabase = await createClient()

    const botId = formData.get('bot_id') as string
    const file = formData.get('carimbo') as File

    if (!file || file.size === 0) {
        return { error: 'Nenhum arquivo selecionado.' }
    }

    try {
        const { data: bot } = await supabase.from('bots').select('empresa_id').eq('id', botId).single()
        if (!bot) return { error: 'Bot não encontrado.' }

        const fileExt = file.name.split('.').pop()
        const fileName = `${bot.empresa_id}/carimbo.${fileExt}`

        const { error: uploadError } = await supabase.storage
            .from('carimbos')
            .upload(fileName, file, { upsert: true })

        if (uploadError) {
            console.error('Erro upload:', uploadError)
            return { error: 'Erro ao fazer upload: ' + uploadError.message }
        }

        const { data: { publicUrl } } = supabase.storage.from('carimbos').getPublicUrl(fileName)

        const { error: updateError } = await supabase
            .from('empresas')
            .update({ carimbo_url: publicUrl })
            .eq('id', bot.empresa_id)

        if (updateError) {
            return { error: 'Erro ao salvar no banco.' }
        }

        revalidatePath(`/bot/${botId}`)
        return { success: 'Carimbo atualizado!' }

    } catch (e: any) {
        return { error: e.message }
    }
}

export async function uploadCarimboFuncionario(formData: FormData) {
    const supabase = await createClient()

    const botId = formData.get('bot_id') as string
    const file = formData.get('carimbo_funcionario') as File

    if (!file || file.size === 0) {
        return { error: 'Nenhum arquivo selecionado.' }
    }

    try {
        const { data: bot } = await supabase.from('bots').select('empresa_id').eq('id', botId).single()
        if (!bot) return { error: 'Bot não encontrado.' }

        const fileExt = file.name.split('.').pop()
        const fileName = `${bot.empresa_id}/carimbo_funcionario.${fileExt}`

        const { error: uploadError } = await supabase.storage
            .from('carimbos')
            .upload(fileName, file, { upsert: true })

        if (uploadError) {
            console.error('Erro upload:', uploadError)
            return { error: 'Erro ao fazer upload: ' + uploadError.message }
        }

        const { data: { publicUrl } } = supabase.storage.from('carimbos').getPublicUrl(fileName)

        const { error: updateError } = await supabase
            .from('empresas')
            .update({ carimbo_funcionario_url: publicUrl })
            .eq('id', bot.empresa_id)

        if (updateError) {
            return { error: 'Erro ao salvar no banco.' }
        }

        revalidatePath(`/bot/${botId}`)
        return { success: 'Carimbo do funcionário atualizado!' }

    } catch (e: any) {
        return { error: e.message }
    }
}
