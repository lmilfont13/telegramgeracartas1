import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { ChevronLeft, FileText, Plus, Edit3, Trash2 } from 'lucide-react'
import TemplatesClient from './TemplatesClient'

export default async function TemplatesPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: empresaId } = await params
    const supabase = await createClient()

    const { data: empresa } = await supabase
        .from('empresas')
        .select('nome')
        .eq('id', empresaId)
        .single()

    const { data: templates } = await supabase
        .from('templates')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('criado_em', { ascending: false })

    return (
        <div className="min-h-screen bg-gray-50/50 p-8 text-black">
            <div className="mx-auto max-w-5xl">
                <div className="flex items-center justify-between mb-8">
                    <Link href={`/empresa/${empresaId}`} className="flex items-center gap-1 text-sm font-bold text-gray-500 hover:text-blue-600 transition-colors group w-fit">
                        <ChevronLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                        Voltar para {empresa?.nome || 'Empresa'}
                    </Link>
                </div>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
                    <div>
                        <h1 className="text-4xl font-black tracking-tight text-gray-950">Modelos de Cartas</h1>
                        <p className="text-gray-500 font-medium">Gerencie o conteúdo das cartas automáticas do bot.</p>
                    </div>
                </div>

                <TemplatesClient empresaId={empresaId} initialTemplates={templates || []} />
            </div>
        </div>
    )
}
