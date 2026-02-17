'use client'

import { useState } from 'react'
import { Save, Trash2, X, Plus, Info } from 'lucide-react'
import { saveTemplate, deleteTemplate } from '../upload-actions'

interface Template {
    id: string
    nome: string
    conteudo: string
}

interface TemplateEditorProps {
    empresaId: string
    initialTemplate?: Template | null
    onClose: () => void
}

export default function TemplateEditor({ empresaId, initialTemplate, onClose }: TemplateEditorProps) {
    const [nome, setNome] = useState(initialTemplate?.nome || '')
    const [conteudo, setConteudo] = useState(initialTemplate?.conteudo || '')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    const variables = [
        { key: '{{NOME}}', label: 'Nome Completo' },
        { key: '{{CARGO}}', label: 'Cargo' },
        { key: '{{LOJA}}', label: 'Unidade/Loja' },
        { key: '{{DATA_ADMISSAO}}', label: 'Data de Admissão' },
        { key: '{{EMPRESA}}', label: 'Nome da Empresa' },
        { key: '{{DATA_ATUAL}}', label: 'Data de Hoje' }
    ]

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setMessage(null)

        const formData = new FormData()
        if (initialTemplate?.id) formData.append('id', initialTemplate.id)
        formData.append('empresa_id', empresaId)
        formData.append('nome', nome)
        formData.append('conteudo', conteudo)

        try {
            const res = await saveTemplate(formData)
            if (res.error) {
                setMessage({ type: 'error', text: res.error })
            } else {
                setMessage({ type: 'success', text: 'Template salvo com sucesso!' })
                setTimeout(onClose, 1500)
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Erro ao conectar ao servidor.' })
        } finally {
            setLoading(false)
        }
    }

    const insertVariable = (variable: string) => {
        setConteudo(prev => prev + ' ' + variable + ' ')
    }

    return (
        <div className="fixed inset-0 bg-gray-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
                <div className="p-6 border-b flex justify-between items-center bg-gray-50/50">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">
                            {initialTemplate ? 'Editar Modelo' : 'Novo Modelo de Carta'}
                        </h2>
                        <p className="text-xs text-gray-500 font-medium">Customize o texto e as variáveis da carta.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                        <X className="h-5 w-5 text-gray-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Nome do Modelo</label>
                        <input
                            value={nome}
                            onChange={e => setNome(e.target.value)}
                            placeholder="Ex: Carta de Promoção 2024"
                            className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all font-bold text-gray-900"
                            required
                        />
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Conteúdo da Carta</label>
                            <div className="group relative">
                                <Info className="h-4 w-4 text-gray-300 cursor-help" />
                                <div className="absolute right-0 bottom-full mb-2 w-64 p-3 bg-gray-900 text-white text-[10px] rounded-xl shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                    Use as variáveis abaixo para que os dados do funcionário sejam preenchidos automaticamente.
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2 mb-2">
                            {variables.map(v => (
                                <button
                                    key={v.key}
                                    type="button"
                                    onClick={() => insertVariable(v.key)}
                                    className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black hover:bg-blue-100 transition-colors uppercase tracking-tight border border-blue-100"
                                >
                                    + {v.label}
                                </button>
                            ))}
                        </div>

                        <textarea
                            value={conteudo}
                            onChange={e => setConteudo(e.target.value)}
                            placeholder="Escreva o texto da carta aqui..."
                            className="w-full h-64 px-4 py-4 rounded-3xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all font-medium text-gray-700 leading-relaxed resize-none"
                            required
                        />
                    </div>

                    {message && (
                        <div className={`p-4 rounded-2xl border ${message.type === 'success' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'} flex items-center gap-3 animate-in slide-in-from-top-2 duration-300`}>
                            {message.type === 'success' ? <Save className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                            <span className="text-xs font-bold uppercase tracking-tight">{message.text}</span>
                        </div>
                    )}
                </form>

                <div className="p-6 border-t bg-gray-50/50 flex gap-3">
                    <button
                        type="submit"
                        disabled={loading}
                        onClick={handleSubmit}
                        className="flex-1 bg-gray-900 text-white py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-gray-800 transition-all active:scale-95 disabled:opacity-50"
                    >
                        <Save className="h-4 w-4" />
                        {loading ? 'Salvando...' : 'Salvar Alterações'}
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-3 bg-white text-gray-500 border border-gray-200 rounded-2xl font-bold hover:bg-gray-100 transition-all active:scale-95"
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    )
}

function AlertCircle(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
    )
}
