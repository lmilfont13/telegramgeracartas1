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
        <div className="space-y-8">
            {/* Company Navigation Tabs */}
            <div className="flex gap-2 p-1 bg-gray-50 rounded-2xl border border-gray-100 overflow-x-auto scrollbar-hide">
                <button
                    onClick={() => setSelectedCompanyId(null)}
                    className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${selectedCompanyId === null ? 'bg-gray-950 text-white shadow-lg' : 'text-gray-400 hover:text-gray-950 hover:bg-white'}`}
                >
                    Global
                </button>
                {companies.map(c => (
                    <button
                        key={c.id}
                        onClick={() => setSelectedCompanyId(c.id)}
                        className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] transition-all duration-300 flex items-center gap-2 whitespace-nowrap ${selectedCompanyId === c.id ? 'bg-gray-950 text-white shadow-lg' : 'text-gray-400 hover:text-gray-950 hover:bg-white'}`}
                    >
                        {c.nome}
                    </button>
                ))}
            </div>

            <div className="space-y-4">
                {filteredTemplates.length > 0 ? (
                    filteredTemplates.map((t) => (
                        <div key={t.id} className={`rounded-[24px] border transition-all duration-500 ${expandedId === t.id ? 'border-gray-950 ring-4 ring-gray-950/5 shadow-2xl bg-white' : 'bg-white border-gray-50 hover:border-gray-200'}`}>
                            <div className="flex items-center justify-between p-6">
                                <div className="flex items-center gap-5 overflow-hidden flex-1">
                                    <div className={`h-12 w-12 rounded-xl flex items-center justify-center transition-all duration-500 ${expandedId === t.id ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-400 border border-gray-100'}`}>
                                        <FileText className="h-5 w-5 stroke-[1.5]" />
                                    </div>
                                    {editingId === t.id ? (
                                        <input
                                            autoFocus
                                            className="rounded-xl bg-white border-2 border-gray-950 px-4 py-2 text-[11px] text-gray-950 font-black outline-none w-full tracking-widest uppercase shadow-sm"
                                            value={newName}
                                            onChange={(e) => setNewName(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleRename(t.id)}
                                        />
                                    ) : (
                                        <div className="flex flex-col overflow-hidden">
                                            <span className="truncate font-black text-sm text-gray-950 tracking-tight uppercase">{t.nome}</span>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[8px] text-gray-400 font-black uppercase tracking-[0.3em]">
                                                    Revision: {new Date(t.criado_em).toLocaleDateString('pt-BR')}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-1">
                                    {editingId === t.id ? (
                                        <>
                                            <button onClick={() => handleRename(t.id)} className="p-3 text-gray-950 hover:bg-gray-50 rounded-xl transition-all">
                                                <Check className="h-4 w-4 stroke-[2.5]" />
                                            </button>
                                            <button onClick={() => setEditingId(null)} className="p-3 text-red-600 hover:bg-red-50 rounded-xl transition-all">
                                                <X className="h-4 w-4 stroke-[2.5]" />
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => { setExpandedId(expandedId === t.id ? null : t.id); setTempContent(t.conteudo || ''); }}
                                                className={`p-3 rounded-xl transition-all duration-300 ${expandedId === t.id ? 'bg-gray-50 text-gray-950' : 'text-gray-300 hover:text-gray-950 hover:bg-gray-50'}`}
                                            >
                                                {expandedId === t.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                            </button>
                                            <button
                                                onClick={() => { setEditingId(t.id); setNewName(t.nome); }}
                                                className="p-3 text-gray-300 hover:text-gray-950 hover:bg-gray-50 rounded-xl transition-all"
                                            >
                                                <Edit2 className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(t.id)}
                                                className="p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Expanded Content Area */}
                            {expandedId === t.id && (
                                <div className="p-6 pt-0 border-t border-gray-50 animate-in slide-in-from-top-4 duration-500">
                                    <div className="flex items-center justify-between mb-4 mt-6">
                                        <p className="text-[9px] text-gray-400 uppercase font-black tracking-[0.3em]">Document Logic Core</p>
                                        <div className="flex gap-2">
                                            {['{{NOME}}', '{{DATA}}'].map(tag => (
                                                <span key={tag} className="text-[8px] bg-gray-950 text-white px-2 py-0.5 rounded-lg font-mono font-black border border-transparent shadow-sm">{tag}</span>
                                            ))}
                                        </div>
                                    </div>
                                    <textarea
                                        className="w-full rounded-[20px] bg-gray-50 border border-transparent p-6 text-[11px] font-mono text-gray-950 outline-none focus:border-gray-950 focus:bg-white transition-all min-h-[220px] shadow-inner leading-relaxed"
                                        value={tempContent}
                                        onChange={(e) => setTempContent(e.target.value)}
                                        placeholder="Hello {{NOME}}, ..."
                                    />
                                    <div className="mt-6 flex justify-end">
                                        <button
                                            disabled={isSaving}
                                            onClick={() => handleSaveContent(t.id)}
                                            className="bg-gray-950 text-white px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-3 hover:bg-gray-800 transition-all disabled:opacity-50 active:scale-95 shadow-xl shadow-gray-200"
                                        >
                                            <Save className="h-4 w-4" />
                                            {isSaving ? 'Processing...' : 'Save logic'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                ) : (
                    <div className="py-20 text-center bg-gray-50/50 rounded-[32px] border border-dashed border-gray-200">
                        <FileText className="h-10 w-10 text-gray-200 mx-auto mb-4" />
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.3em]">Empty logic vault</p>
                    </div>
                )}
            </div>

            {/* Action Area */}
            {!isAdding ? (
                <button
                    onClick={() => setIsAdding(true)}
                    className="group w-full flex items-center justify-center gap-3 py-4 border-2 border-dashed border-gray-100 rounded-[24px] text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 hover:border-gray-950 hover:text-gray-950 transition-all bg-transparent active:scale-[0.98]"
                >
                    <Plus className="h-4 w-4 stroke-[3] transition-transform group-hover:rotate-90" />
                    New Pattern
                </button>
            ) : (
                <form onSubmit={handleCreate} className="bg-white p-8 rounded-[32px] border border-gray-950 shadow-2xl animate-in zoom-in-95 duration-500">
                    <h3 className="text-[10px] font-black mb-6 text-gray-950 uppercase tracking-[0.3em] flex items-center gap-2">
                        <div className="h-1.5 w-1.5 bg-gray-950 rounded-full"></div>
                        Initialize Pattern
                    </h3>
                    <div className="flex flex-col gap-4">
                        <input
                            autoFocus
                            placeholder="PATTERN SYSTEM NAME"
                            className="w-full rounded-2xl border border-transparent bg-gray-50 p-4 text-[10px] font-black text-gray-950 outline-none focus:border-gray-950 focus:bg-white transition-all tracking-[0.2em] uppercase placeholder:opacity-50"
                            value={newTemplateName}
                            onChange={(e) => setNewTemplateName(e.target.value)}
                        />
                        <div className="flex gap-2">
                            <button type="submit" className="flex-1 bg-gray-950 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-gray-800 transition-all shadow-xl shadow-gray-200">COMMIT</button>
                            <button type="button" onClick={() => setIsAdding(false)} className="px-6 bg-gray-100 text-gray-400 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:text-gray-950 transition-all">ABORT</button>
                        </div>
                    </div>
                </form>
            )}
        </div>
    )
}
