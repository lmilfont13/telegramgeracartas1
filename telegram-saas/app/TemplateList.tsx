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
        <div className="space-y-6">
            {/* Abas de Navegação das Empresas */}
            <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
                <button
                    onClick={() => setSelectedCompanyId(null)}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedCompanyId === null ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-gray-800 text-gray-400 border border-gray-700 hover:text-white hover:border-gray-600'}`}
                >
                    Geral
                </button>
                {companies.map(c => (
                    <button
                        key={c.id}
                        onClick={() => setSelectedCompanyId(c.id)}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${selectedCompanyId === c.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-gray-800 text-gray-400 border border-gray-700 hover:text-white hover:border-gray-600'}`}
                    >
                        {c.logo_url && <img src={c.logo_url} className="w-4 h-4 rounded-full object-cover bg-white" />}
                        {c.nome}
                    </button>
                ))}
            </div>

            <div className="space-y-3">
                {filteredTemplates.length > 0 ? (
                    filteredTemplates.map((t) => (
                        <div key={t.id} className={`rounded-2xl border transition-all ${expandedId === t.id ? 'bg-gray-900 border-blue-600/50 ring-4 ring-blue-500/5' : 'bg-gray-900/50 border-gray-800 hover:border-gray-700'}`}>
                            <div className="flex items-center justify-between p-4">
                                <div className="flex items-center gap-3 overflow-hidden flex-1">
                                    <FileText className={`h-5 w-5 flex-shrink-0 ${selectedCompanyId ? 'text-blue-500' : 'text-gray-600'}`} />
                                    {editingId === t.id ? (
                                        <input
                                            autoFocus
                                            className="rounded-lg bg-gray-800 border-2 border-blue-600 px-3 py-1.5 text-xs text-white font-bold outline-none w-full"
                                            value={newName}
                                            onChange={(e) => setNewName(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleRename(t.id)}
                                        />
                                    ) : (
                                        <div className="flex flex-col overflow-hidden">
                                            <span className="truncate font-black text-sm text-gray-100 uppercase tracking-tight">{t.nome}</span>
                                            <span className="text-[9px] text-gray-600 font-black uppercase tracking-widest">
                                                {new Date(t.criado_em).toLocaleDateString()}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-1">
                                    {editingId === t.id ? (
                                        <>
                                            <button onClick={() => handleRename(t.id)} className="p-2 text-green-500 hover:bg-green-500/10 rounded-xl transition-colors">
                                                <Check className="h-4 w-4 stroke-[3]" />
                                            </button>
                                            <button onClick={() => setEditingId(null)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-xl transition-colors">
                                                <X className="h-4 w-4 stroke-[3]" />
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => { setExpandedId(expandedId === t.id ? null : t.id); setTempContent(t.conteudo || ''); }}
                                                className={`p-2 rounded-xl transition-all ${expandedId === t.id ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-white hover:bg-gray-800'}`}
                                            >
                                                {expandedId === t.id ? <ChevronUp className="h-4 w-4 stroke-[3]" /> : <ChevronDown className="h-4 w-4 stroke-[3]" />}
                                            </button>
                                            <button
                                                onClick={() => { setEditingId(t.id); setNewName(t.nome); }}
                                                className="p-2 text-gray-500 hover:text-blue-500 hover:bg-blue-500/10 rounded-xl transition-colors"
                                            >
                                                <Edit2 className="h-4 w-4 stroke-[2.5]" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(t.id)}
                                                className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-colors"
                                            >
                                                <Trash2 className="h-4 w-4 stroke-[2.5]" />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Área de Edição de Conteúdo Expandida */}
                            {expandedId === t.id && (
                                <div className="p-4 pt-0 border-t border-gray-800 animate-in slide-in-from-top-4">
                                    <div className="flex items-center justify-between mb-3 mt-4">
                                        <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest">Estrutura do Documento</p>
                                        <div className="flex gap-2">
                                            {['{{NOME}}', '{{DATA}}'].map(tag => (
                                                <span key={tag} className="text-[8px] bg-gray-800 text-blue-400 px-1.5 py-0.5 rounded font-mono font-bold">{tag}</span>
                                            ))}
                                        </div>
                                    </div>
                                    <textarea
                                        className="w-full rounded-2xl bg-gray-950 border-2 border-gray-800 p-4 text-xs font-mono text-gray-300 shadow-inner outline-none focus:border-blue-600 transition-all min-h-[180px] scrollbar-hide"
                                        value={tempContent}
                                        onChange={(e) => setTempContent(e.target.value)}
                                        placeholder="Olá {{NOME}}, ..."
                                    />
                                    <div className="mt-4 flex justify-end">
                                        <button
                                            disabled={isSaving}
                                            onClick={() => handleSaveContent(t.id)}
                                            className="bg-blue-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-blue-700 transition-all disabled:opacity-50 active:scale-95"
                                        >
                                            <Save className="h-4 w-4 stroke-[2.5]" />
                                            {isSaving ? 'SALVANDO...' : 'SALVAR TEMPLATE'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                ) : (
                    <div className="py-12 text-center bg-gray-900/40 rounded-[28px] border-2 border-dashed border-gray-800">
                        <FileText className="h-8 w-8 text-gray-800 mx-auto mb-3" />
                        <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">Nenhum modelo cadastrado</p>
                    </div>
                )}
            </div>

            {/* Ação de Adição */}
            {!isAdding ? (
                <button
                    onClick={() => setIsAdding(true)}
                    className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-gray-800 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 hover:border-blue-600/50 hover:text-blue-500 transition-all bg-transparent active:scale-[0.98]"
                >
                    <Plus className="h-4 w-4 stroke-[3]" />
                    ADICIONAR NOVO TEMPLATE
                </button>
            ) : (
                <form onSubmit={handleCreate} className="bg-blue-600 p-6 rounded-2xl shadow-xl shadow-blue-500/20 animate-in zoom-in-95">
                    <h3 className="text-[10px] font-black mb-4 text-white uppercase tracking-widest">Configurar Novo Modelo</h3>
                    <div className="flex flex-col gap-3">
                        <input
                            autoFocus
                            placeholder="NOME DO MODELO (EX: CARTA DE ADVERTÊNCIA)"
                            className="w-full rounded-xl border-0 bg-blue-700 p-3.5 text-xs font-bold text-white placeholder-blue-300 outline-none focus:ring-2 focus:ring-white/50 transition-all uppercase tracking-widest"
                            value={newTemplateName}
                            onChange={(e) => setNewTemplateName(e.target.value)}
                        />
                        <div className="flex gap-2">
                            <button type="submit" className="flex-1 bg-white text-blue-600 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-100 active:scale-95 transition-all">CRIAR AGORA</button>
                            <button type="button" onClick={() => setIsAdding(false)} className="px-5 bg-blue-500 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-400 transition-all">CANCELAR</button>
                        </div>
                    </div>
                </form>
            )}
        </div>
    )
}
