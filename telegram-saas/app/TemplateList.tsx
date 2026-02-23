'use client'

import { useState } from 'react'
import { createTemplate, deleteTemplate, updateTemplateContent, renameTemplate } from './actions'
import { FileText, Plus, Trash2, Edit3, Eye, Copy, ChevronRight, Check, X, Save, ChevronDown, ChevronUp } from 'lucide-react'

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
        if (selectedCompanyId) formData.append('empresa_id', selectedCompanyId)
        const result = await createTemplate(formData)
        if (result.success) window.location.reload()
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
        if (!confirm('Excluir este modelo?')) return
        const result = await deleteTemplate(id)
        if (result.success) setTemplates(templates.filter(t => t.id !== id))
    }

    return (
        <div className="space-y-6">
            <div className="flex gap-1 overflow-x-auto pb-3 scrollbar-hide">
                <button
                    onClick={() => setSelectedCompanyId(null)}
                    className={`px-3 py-1.5 rounded-md text-[9px] font-bold uppercase tracking-wider transition-all border ${selectedCompanyId === null ? 'bg-black text-white border-black' : 'bg-white text-[#90949C] border-[#E2E4E6] hover:border-black hover:text-black'}`}
                >
                    GLOBAL
                </button>
                {companies.map(c => (
                    <button
                        key={c.id}
                        onClick={() => setSelectedCompanyId(c.id)}
                        className={`px-3 py-1.5 rounded-md text-[9px] font-bold uppercase tracking-wider transition-all border whitespace-nowrap ${selectedCompanyId === c.id ? 'bg-black text-white border-black' : 'bg-white text-[#90949C] border-[#E2E4E6] hover:border-black hover:text-black'}`}
                    >
                        {c.nome}
                    </button>
                ))}
            </div>

            <div className="space-y-1.5">
                {filteredTemplates.length > 0 ? (
                    filteredTemplates.map((t) => (
                        <div key={t.id} className={`group rounded-lg border transition-all ${expandedId === t.id ? 'border-black bg-white ring-[0.5px] ring-black shadow-sm' : 'bg-white border-[#E2E4E6] hover:border-black'}`}>
                            <div className="flex items-center justify-between p-3">
                                <div className="flex items-center gap-3 overflow-hidden flex-1">
                                    <div className={`h-8 w-8 flex-shrink-0 rounded flex items-center justify-center transition-colors ${expandedId === t.id ? 'bg-black text-white' : 'bg-gray-50 text-[#90949C] border border-[#E2E4E6] group-hover:bg-black group-hover:text-white'}`}>
                                        <FileText className="h-3.5 w-3.5" />
                                    </div>
                                    {editingId === t.id ? (
                                        <input
                                            autoFocus
                                            className="rounded border border-black px-2 py-1 text-[10px] text-black font-bold outline-none w-full uppercase"
                                            value={newName}
                                            onChange={(e) => setNewName(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleRename(t.id)}
                                        />
                                    ) : (
                                        <span className="truncate font-bold text-[11px] text-black uppercase tracking-tight">{t.nome}</span>
                                    )}
                                </div>

                                <div className="flex items-center">
                                    {editingId === t.id ? (
                                        <>
                                            <button onClick={() => handleRename(t.id)} className="p-1.5 text-black"><Check className="h-3.5 w-3.5" /></button>
                                            <button onClick={() => setEditingId(null)} className="p-1.5 text-red-500"><X className="h-3.5 w-3.5" /></button>
                                        </>
                                    ) : (
                                        <>
                                            <button onClick={() => { setExpandedId(expandedId === t.id ? null : t.id); setTempContent(t.conteudo || ''); }} className={`p-1.5 rounded transition-colors ${expandedId === t.id ? 'bg-black text-white' : 'text-[#C0C4C9] hover:text-black'}`}>
                                                {expandedId === t.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                                            </button>
                                            <button onClick={() => { setEditingId(t.id); setNewName(t.nome); }} className="p-1.5 text-[#C0C4C9] hover:text-black transition-colors"><Edit3 className="h-3.5 w-3.5" /></button>
                                            <button onClick={() => handleDelete(t.id)} className="p-1.5 text-[#C0C4C9] hover:text-black transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {expandedId === t.id && (
                                <div className="p-4 pt-0 border-t border-[#F0F2F4] animate-in slide-in-from-top-1">
                                    <div className="flex items-center justify-between mb-3 mt-4">
                                        <p className="text-[9px] text-[#90949C] uppercase font-bold tracking-widest">LÓGICA DO MODELO</p>
                                        <div className="flex gap-1.5">
                                            {['{{NOME}}', '{{LOJA}}', '{{DATA}}'].map(tag => (
                                                <span key={tag} className="text-[8px] bg-gray-100 border border-[#E2E4E6] text-black px-1.5 py-0.5 rounded font-mono font-bold">{tag}</span>
                                            ))}
                                        </div>
                                    </div>
                                    <textarea
                                        className="w-full rounded border border-[#E2E4E6] p-4 text-[11px] font-mono text-black outline-none focus:border-black bg-gray-50/30 transition-all min-h-[200px] resize-none leading-relaxed"
                                        value={tempContent}
                                        onChange={(e) => setTempContent(e.target.value)}
                                    />
                                    <div className="mt-4 flex justify-end">
                                        <button
                                            disabled={isSaving}
                                            onClick={() => handleSaveContent(t.id)}
                                            className="bg-black text-white px-6 py-2 rounded text-[9px] font-bold uppercase tracking-widest hover:bg-neutral-800 transition-all disabled:opacity-50"
                                        >
                                            <Save className="h-3.5 w-3.5 mr-2 inline" />
                                            {isSaving ? 'SALVANDO...' : 'SALVAR MODELO'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                ) : (
                    <div className="py-8 text-center border border-dashed border-[#E2E4E6] rounded-lg">
                        <p className="text-[9px] text-[#90949C] font-bold uppercase tracking-widest">NENHUM MODELO</p>
                    </div>
                )}
            </div>

            {!isAdding ? (
                <button
                    onClick={() => setIsAdding(true)}
                    className="w-full mt-4 flex items-center justify-center gap-2 py-2 border border-dashed border-[#E2E4E6] rounded-md text-[9px] font-bold uppercase tracking-widest text-[#90949C] hover:border-black hover:text-black transition-all bg-white"
                >
                    <Plus className="h-3.5 w-3.5" />
                    CRIAR MODELO
                </button>
            ) : (
                <form onSubmit={handleCreate} className="mt-4 border border-black p-4 rounded-lg bg-white space-y-3 animate-in zoom-in-95">
                    <input
                        autoFocus
                        placeholder="NOME"
                        className="w-full border border-[#E2E4E6] rounded px-3 py-2 text-[10px] font-bold text-black outline-none focus:border-black uppercase mb-2"
                        value={newTemplateName}
                        onChange={(e) => setNewTemplateName(e.target.value)}
                    />
                    <div className="flex gap-1.5">
                        <button type="submit" className="flex-1 bg-black text-white py-2 rounded text-[9px] font-bold uppercase tracking-widest hover:bg-neutral-800 transition-all">ADICIONAR</button>
                        <button type="button" onClick={() => setIsAdding(false)} className="px-4 bg-white border border-[#E2E4E6] text-[#90949C] py-2 rounded text-[9px] font-bold uppercase hover:text-black transition-all">X</button>
                    </div>
                </form>
            )}
        </div>
    )
}
