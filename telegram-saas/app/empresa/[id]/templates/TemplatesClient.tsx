'use client'

import { useState } from 'react'
import { FileText, Plus, Edit3, Trash2 } from 'lucide-react'
import TemplateEditor from './TemplateEditor'
import { deleteTemplate } from '../upload-actions'

interface Template {
    id: string
    nome: string
    conteudo: string
}

interface TemplatesClientProps {
    empresaId: string
    initialTemplates: Template[]
}

export default function TemplatesClient({ empresaId, initialTemplates }: TemplatesClientProps) {
    const [isEditorOpen, setIsEditorOpen] = useState(false)
    const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
    const [loading, setLoading] = useState<string | null>(null)

    const handleEdit = (template: Template) => {
        setSelectedTemplate(template)
        setIsEditorOpen(true)
    }

    const handleCreate = () => {
        setSelectedTemplate(null)
        setIsEditorOpen(true)
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este modelo?')) return

        setLoading(id)
        const formData = new FormData()
        formData.append('id', id)
        formData.append('empresa_id', empresaId)

        try {
            await deleteTemplate(formData)
        } catch (err) {
            alert('Erro ao excluir template.')
        } finally {
            setLoading(null)
        }
    }

    return (
        <div className="space-y-6">
            <button
                onClick={handleCreate}
                className="w-full h-24 border-2 border-dashed border-gray-200 rounded-3xl flex items-center justify-center gap-3 text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/50 transition-all group"
            >
                <div className="p-2 bg-gray-100 rounded-full group-hover:bg-blue-600 group-hover:text-white transition-all">
                    <Plus className="h-5 w-5" />
                </div>
                <span className="font-bold uppercase tracking-widest text-xs">Criar Novo Modelo</span>
            </button>

            <div className="grid gap-6 md:grid-cols-2">
                {initialTemplates.map(t => (
                    <div key={t.id} className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden">
                        <div className="flex items-start justify-between relative z-10">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                                    <FileText className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 leading-tight">{t.nome}</h3>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                                        Personalizável
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-1">
                                <button
                                    onClick={() => handleEdit(t)}
                                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                    title="Editar"
                                >
                                    <Edit3 className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => handleDelete(t.id)}
                                    disabled={loading === t.id}
                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                    title="Excluir"
                                >
                                    {loading === t.id ? (
                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-600 border-t-transparent"></div>
                                    ) : (
                                        <Trash2 className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-gray-50">
                            <p className="text-xs text-gray-500 line-clamp-3 leading-relaxed font-medium bg-gray-50 p-3 rounded-xl border border-gray-100">
                                {t.conteudo}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {isEditorOpen && (
                <TemplateEditor
                    empresaId={empresaId}
                    initialTemplate={selectedTemplate}
                    onClose={() => setIsEditorOpen(false)}
                />
            )}
        </div>
    )
}
