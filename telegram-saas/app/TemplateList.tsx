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
            <div className="flex gap-1.5 overflow-x-auto pb-3 scrollbar-hide">
                <button
                    onClick={() => setSelectedCompanyId(null)}
                    className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${selectedCompanyId === null ? 'bg-black text-white border-black shadow-xl shadow-black/10' : 'bg-white text-gray-400 border-gray-100 hover:border-black'}`}
                >
                    GLOBAL
                </button>
                {companies.map(c => (
                    <button
                        key={c.id}
                        onClick={() => setSelectedCompanyId(c.id)}
                        className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border whitespace-nowrap ${selectedCompanyId === c.id ? 'bg-black text-white border-black shadow-xl shadow-black/10' : 'bg-white text-gray-400 border-gray-100 hover:border-black'}`}
                    >
                        {c.nome}
                    </button>
                ))}
            </div>

            <div className="grid gap-3">
                {filteredTemplates.length > 0 ? (
                    filteredTemplates.map((t) => (
                        <div key={t.id} className={`group rounded-[32px] border transition-all duration-500 overflow-hidden ${expandedId === t.id ? 'border-black ring-1 ring-black bg-white shadow-2xl' : 'bg-white border-gray-50 hover:border-black'}`}>
                            <div className="flex items-center justify-between p-5">
                                <div className="flex items-center gap-5 overflow-hidden flex-1">
                                    <div className={`h-12 w-12 flex-shrink-0 rounded-2xl flex items-center justify-center transition-all duration-500 ${expandedId === t.id ? 'bg-black text-white' : 'bg-gray-50 text-black border border-gray-100 group-hover:bg-black group-hover:text-white'}`}>
                                        <FileText className="h-5 w-5 stroke-[2]" />
                                    </div>
                                    {editingId === t.id ? (
                                        <input
                                            autoFocus
                                            className="rounded-xl bg-gray-50 border border-black px-4 py-3 text-[10px] text-black font-black outline-none w-full tracking-[0.1em] uppercase"
                                            value={newName}
                                            onChange={(e) => setNewName(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleRename(t.id)}
                                        />
                                    ) : (
                                        <div className="flex flex-col overflow-hidden">
                                            <span className="truncate font-black text-[13px] text-black tracking-tight uppercase">{t.nome}</span>
                                            <span className="text-[8px] text-gray-400 font-black uppercase tracking-[0.2em] mt-0.5">ESTRUTURA LÓGICA</span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-1.5 px-2">
                                    {editingId === t.id ? (
                                        <>
                                            <button onClick={() => handleRename(t.id)} className="p-3 text-black hover:bg-gray-100 rounded-xl transition-all"><Check className="h-4 w-4" /></button>
                                            <button onClick={() => setEditingId(null)} className="p-3 text-red-600 hover:bg-red-50 rounded-xl transition-all"><X className="h-4 w-4" /></button>
                                        </>
                                    ) : (
                                        <>
                                            <button onClick={() => { setExpandedId(expandedId === t.id ? null : t.id); setTempContent(t.conteudo || ''); }} className={`p-3 rounded-xl transition-all ${expandedId === t.id ? 'bg-black text-white' : 'text-gray-300 hover:text-black hover:bg-gray-50'}`}>
                                                {expandedId === t.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                            </button>
                                            <button onClick={() => { setEditingId(t.id); setNewName(t.nome); }} className="p-3 text-gray-300 hover:text-black hover:bg-gray-50 rounded-xl transition-all"><Edit3 className="h-4 w-4" /></button>
                                            <button onClick={() => handleDelete(t.id)} className="p-3 text-gray-200 hover:text-black transition-all"><Trash2 className="h-4 w-4" /></button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {expandedId === t.id && (
                                <div className="p-8 pt-0 border-t border-gray-50 animate-in slide-in-from-top-4 duration-500">
                                    <div className="flex items-center justify-between mb-5 mt-8">
                                        <p className="text-[10px] text-gray-400 uppercase font-black tracking-[0.3em]">CONTEÚDO DO MODELO</p>
                                        <div className="flex gap-2">
                                            {['{{NOME}}', '{{LOJA}}', '{{DATA}}'].map(tag => (
                                                <span key={tag} className="text-[9px] bg-black text-white px-3 py-1 rounded-lg font-mono font-black">{tag}</span>
                                            ))}
                                        </div>
                                    </div>
                                    <textarea
                                        className="w-full rounded-[24px] bg-gray-50 border border-transparent p-6 text-[12px] font-mono text-black outline-none focus:border-black focus:bg-white transition-all min-h-[300px] resize-none leading-relaxed"
                                        value={tempContent}
                                        onChange={(e) => setTempContent(e.target.value)}
                                    />
                                    <div className="mt-8 flex justify-end">
                                        <button
                                            disabled={isSaving}
                                            onClick={() => handleSaveContent(t.id)}
                                            className="bg-black text-white px-10 py-5 rounded-[20px] text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-3 hover:bg-neutral-800 transition-all disabled:opacity-50 active:scale-95 shadow-2xl shadow-black/20"
                                        >
                                            <Save className="h-4 w-4" />
                                            {isSaving ? 'PROCESSANDO...' : 'SALVAR MODELO'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                ) : (
                    <div className="py-12 text-center bg-gray-50/50 rounded-[40px] border border-dashed border-gray-100">
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.3em]">Nenhum modelo encontrado</p>
                    </div>
                )}
            </div>

            {!isAdding ? (
                <button
                    onClick={() => setIsAdding(true)}
                    className="w-full flex items-center justify-center gap-3 py-5 border-2 border-dashed border-gray-100 rounded-[28px] text-[10px] font-black uppercase tracking-[0.3em] text-gray-300 hover:border-black hover:text-black transition-all bg-white group"
                >
                    <Plus className="h-5 w-5 group-hover:scale-110 transition-transform" />
                    CRIAR MODELO
                </button>
            ) : (
                <form onSubmit={handleCreate} className="bg-gray-50/50 p-8 rounded-[40px] border border-black space-y-4 animate-in zoom-in-95 duration-300">
                    <input
                        autoFocus
                        placeholder="NOME DO MODELO"
                        className="w-full rounded-2xl bg-white p-5 text-[10px] font-black text-black outline-none focus:border-black transition-all tracking-[0.2em] uppercase shadow-sm"
                        value={newTemplateName}
                        onChange={(e) => setNewTemplateName(e.target.value)}
                    />
                    <div className="flex gap-2">
                        <button type="submit" className="flex-1 bg-black text-white py-4.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] hover:bg-neutral-800 transition-all">ADICIONAR</button>
                        <button type="button" onClick={() => setIsAdding(false)} className="px-8 bg-white border border-gray-200 text-gray-400 py-4.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] hover:text-black transition-all whitespace-nowrap">CANCELAR</button>
                    </div>
                </form>
            )}
        </div>
    )
}
