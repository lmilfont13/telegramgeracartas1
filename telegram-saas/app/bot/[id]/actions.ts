'use server'

import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

export async function updateBot(formData: FormData) {
    const supabase = await createClient()

    const botId = formData.get('id') as string
    const nomeBot = formData.get('nome') as string
    const templateBot = formData.get('template') as string

    try {
        // 1. Buscar o bot para saber a empresa_id
        const { data: bot } = await supabase.from('bots').select('empresa_id').eq('id', botId).single()
        if (!bot) return { error: 'Bot não encontrado' }

        // 2. Atualizar o nome do bot (apenas se fornecido)
        if (nomeBot) {
            const { error: botError } = await supabase
                .from('bots')
                .update({ nome: nomeBot })
                .eq('id', botId)
            if (botError) throw botError
        }

        // 3. Salvar o template (Manual Check + Save para evitar erro de constraint)
        const { data: existingTemplate } = await supabase
            .from('templates')
            .select('id')
            .eq('empresa_id', bot.empresa_id)
            .maybeSingle()

        if (existingTemplate) {
            const { error: upError } = await supabase
                .from('templates')
                .update({ conteudo: templateBot })
                .eq('id', existingTemplate.id)
            if (upError) console.error('Erro update template:', upError)
        } else {
            const { error: inError } = await supabase
                .from('templates')
                .insert({
                    empresa_id: bot.empresa_id,
                    conteudo: templateBot,
                    nome: 'Padrão'
                })
            if (inError) console.error('Erro insert template:', inError)
        }

        revalidatePath(`/bot/${botId}`)
        return { success: 'Configurações salvas!' }

    } catch (e: any) {
        console.error('Erro updateBot:', e)
        return { error: 'Erro ao salvar: ' + e.message }
    }
}

export async function updateToken(formData: FormData) {
    const supabase = await createClient()
    const botId = formData.get('id') as string
    const token = formData.get('token') as string

    await supabase.from('bots').update({ token_telegram: token }).eq('id', botId)
    redirect(`/bot/${botId}`)
}
