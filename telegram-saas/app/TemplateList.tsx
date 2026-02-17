'use client'

import { useState } from 'react'
import { renameTemplate, deleteTemplate, createTemplate, updateTemplateContent } from './actions'
import { Edit2, Trash2, Check, X, FileText, Plus, Save, ChevronDown, ChevronUp } from 'lucide-react'

interface Template {
    id: string
    nome: string
    conteudo: string
    empresa_id: string | null
    criado_em: string
}

interface Company {
    id: string
    nome: string
    logo_url: string | null
}

export default function TemplateList({ initialTemplates, companies }: { initialTemplates: Template[], companies: Company[] }) {
    const [templates, setTemplates] = useState<Template[]>(initialTemplates)
    const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [newName, setNewName] = useState('')
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [tempContent, setTempContent] = useState('')

    const [newTemplateName, setNewTemplateName] = useState('')
    const [isAdding, setIsAdding] = useState(false)
    const [isSaving, setIsSaving] = useState(false)

    const filteredTemplates = templates.filter(t =>
        selectedCompanyId === null ? t.empresa_id === null : t.empresa_id === selectedCompanyId
    )

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newTemplateName.trim()) return

        const formData = new FormData()
        formData.append('nome', newTemplateName)
        if (selectedCompanyId) {
            formData.append('empresa_id', selectedCompanyId)
        }

        const result = await createTemplate(formData)
        if (result.success) {
            window.location.reload()
        }
    }

    const handleRename = async (id: string) => {
        if (!newName.trim()) return
        const result = await renameTemplate(id, newName)
        if (result.success) {
            setTemplates(templates.map(t => t.id === id ? { ...t, nome: newName } : t))
            setEditingId(null)
        }
    }

    const handleSaveContent = async (id: string) => {
        setIsSaving(true)
        const result = await updateTemplateContent(id, tempContent)
        if (result.success) {
            setTemplates(templates.map(t => t.id === id ? { ...t, conteudo: tempContent } : t))
            setExpandedId(null)
        }
        setIsSaving(false)
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este modelo?')) return
        const result = await deleteTemplate(id)
        if (result.success) {
            setTemplates(templates.filter(t => t.id !== id))
        }
    }

    return (
        <div className="space-y-4">
            {/* Form de Adição */}
            {!isAdding ? (
                <button
                    onClick={() => setIsAdding(true)}
                    className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm font-bold text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-all bg-white shadow-sm"
                >
                    <Plus className="h-4 w-4" />
                    Novo Modelo de Carta
                </button>
            ) : (
                <form onSubmit={handleCreate} className="bg-white p-4 rounded-xl border border-blue-200 shadow-sm animate-in fade-in slide-in-from-top-2">
                    <h3 className="text-sm font-bold mb-3 text-blue-600">Criar Novo Modelo</h3>
                    <div className="flex gap-2">
                        <input
                            autoFocus
                            placeholder="Nome do Modelo (Ex: Carta de Demissão)"
                            className="flex-1 rounded-lg border p-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                            value={newTemplateName}
                            onChange={(e) => setNewTemplateName(e.target.value)}
                        />
                        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700">Criar</button>
                        <button type="button" onClick={() => setIsAdding(false)} className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-200">Cancelar</button>
                    </div>
                </form>
            )}

            {/* Abas de Navegação das Empresas */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                <button
                    onClick={() => setSelectedCompanyId(null)}
                    className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${selectedCompanyId === null ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
                >
                    Geral
                </button>
                {companies.map(c => (
                    <button
                        key={c.id}
                        onClick={() => setSelectedCompanyId(c.id)}
                        className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors flex items-center gap-2 ${selectedCompanyId === c.id ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
                    >
                        {c.logo_url && <img src={c.logo_url} className="w-4 h-4 rounded-full object-cover bg-white" />}
                        {c.nome}
                    </button>
                ))}
            </div>

            <div className="space-y-3">
                {filteredTemplates.length > 0 ? (
                    filteredTemplates.map((t) => (
                        <div key={t.id} className={`rounded-xl border bg-white shadow-sm overflow-hidden transition-all ${expandedId === t.id ? 'ring-2 ring-blue-100' : ''}`}>
                            <div className="flex items-center justify-between p-4">
                                <div className="flex items-center gap-3 overflow-hidden flex-1">
                                    <FileText className={`h-5 w-5 flex-shrink-0 ${selectedCompanyId ? 'text-blue-500' : 'text-gray-400'}`} />
                                    {editingId === t.id ? (
                                        <input
                                            autoFocus
                                            className="rounded border px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-blue-500 w-full"
                                            value={newName}
                                            onChange={(e) => setNewName(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleRename(t.id)}
                                        />
                                    ) : (
                                        <div className="flex flex-col overflow-hidden">
                                            <span className="truncate font-bold text-sm">{t.nome}</span>
                                            <span className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold flex items-center gap-1">
                                                {new Date(t.criado_em).toLocaleDateString()}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-1">
                                    {editingId === t.id ? (
                                        <>
                                            <button onClick={() => handleRename(t.id)} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                                                <Check className="h-4 w-4" />
                                            </button>
                                            <button onClick={() => setEditingId(null)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                                <X className="h-4 w-4" />
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => { setExpandedId(expandedId === t.id ? null : t.id); setTempContent(t.conteudo || ''); }}
                                                className={`p-1.5 rounded-lg transition-colors ${expandedId === t.id ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'}`}
                                            >
                                                {expandedId === t.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                            </button>
                                            <button
                                                onClick={() => { setEditingId(t.id); setNewName(t.nome); }}
                                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                            >
                                                <Edit2 className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(t.id)}
                                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Área de Edição de Conteúdo Expandida */}
                            {expandedId === t.id && (
                                <div className="p-4 pt-0 border-t border-gray-50 bg-gray-50/50 animate-in slide-in-from-top-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Conteúdo do Modelo</p>
                                        <p className="text-[10px] text-gray-400 italic">Dica: use {`{{NOME}}, {{LOJA}}, {{DATA}}`}</p>
                                    </div>
                                    <textarea
                                        className="w-full rounded-xl border border-gray-200 p-3 text-sm font-mono shadow-inner outline-none focus:ring-2 focus:ring-blue-100 min-h-[200px]"
                                        value={tempContent}
                                        onChange={(e) => setTempContent(e.target.value)}
                                        placeholder="Olá {{NOME}}, ..."
                                    />
                                    <div className="mt-3 flex justify-end">
                                        <button
                                            disabled={isSaving}
                                            onClick={() => handleSaveContent(t.id)}
                                            className="bg-gray-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-black transition-all disabled:opacity-50"
                                        >
                                            <Save className="h-4 w-4" />
                                            {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                ) : (
                    <div className="py-12 text-center bg-white rounded-xl border border-dashed border-gray-200">
                        <FileText className="h-8 w-8 text-gray-200 mx-auto mb-2" />
                        <p className="text-sm text-gray-400">Nenhum modelo cadastrado nesta categoria.</p>
                    </div>
                )}
            </div>
        </div>
    )
}
