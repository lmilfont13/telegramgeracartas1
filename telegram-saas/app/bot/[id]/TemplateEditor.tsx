'use client'
import { useState, useRef } from 'react'
import { Save, Upload, CheckCircle2, AlertCircle } from 'lucide-react'

interface TemplateEditorProps {
    botId: string
    initialTemplate: string
    availablePlaceholders?: string[]
    action: (formData: FormData) => Promise<{ success?: string, error?: string }>
}

export default function TemplateEditor({ botId, initialTemplate, availablePlaceholders = [], action }: TemplateEditorProps) {
    const [template, setTemplate] = useState(initialTemplate)
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    const insertPlaceholder = (ph: string) => {
        const textToInsert = `{{${ph.toUpperCase()}}}`
        setTemplate(prev => prev + textToInsert)
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        setMessage(null)

        const formData = new FormData()
        formData.append('id', botId)
        formData.append('template', template)

        try {
            const result = await action(formData)
            if (result.error) {
                setMessage({ type: 'error', text: result.error })
            } else {
                setMessage({ type: 'success', text: result.success || 'Modelo salvo!' })
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Falha na conexão.' })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="rounded-lg border border-[#E2E4E6] bg-white p-6 shadow-sm">
            <h3 className="text-[11px] font-bold mb-6 flex items-center gap-2 uppercase tracking-[0.2em] text-black">
                <div className="h-1.5 w-1.5 rounded-full bg-black"></div>
                MODELO DE DOCUMENTO LÓGICO
            </h3>

            <div className="mb-6">
                <p className="text-[9px] font-bold text-[#90949C] uppercase tracking-widest mb-3">CONVENCIONAIS (CLIQUE PARA INSERIR)</p>
                <div className="flex flex-wrap gap-1">
                    {['nome', 'loja', 'cargo', 'rg', 'cpf', 'data', 'cdc', 'data_admissao', ...availablePlaceholders].map((ph) => (
                        <button
                            key={ph}
                            type="button"
                            onClick={() => insertPlaceholder(ph)}
                            className="px-2 py-1 bg-gray-50 hover:bg-black border border-[#E2E4E6] hover:border-black rounded text-[9px] font-bold text-[#60646C] hover:text-white transition-all uppercase tabular-nums"
                        >
                            {`{{${ph.toUpperCase()}}}`}
                        </button>
                    ))}
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                <textarea
                    name="template"
                    rows={12}
                    value={template}
                    onChange={(e) => setTemplate(e.target.value)}
                    className="block w-full rounded border border-[#E2E4E6] p-5 text-[11px] font-mono focus:border-black outline-none transition-all bg-gray-50/50 leading-relaxed text-black"
                    placeholder="Insira a estrutura lógica do documento..."
                />
                <div className="mt-6 flex items-center justify-between">
                    <div>
                        {message && (
                            <div className={`flex items-center gap-2 ${message.type === 'error' ? 'text-red-600' : 'text-black'} animate-in fade-in slide-in-from-top-1 duration-300`}>
                                {message.type === 'error' ? <AlertCircle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                                <span className="text-[10px] font-bold uppercase tracking-widest">{message.text}</span>
                            </div>
                        )}
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-black text-white px-8 py-2.5 rounded text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-neutral-800 disabled:opacity-50 transition-all flex items-center gap-2 active:scale-[0.98]"
                    >
                        <Save className="h-4 w-4" />
                        {loading ? 'PROCESSANDO...' : 'SALVAR ESTRUTURA'}
                    </button>
                </div>
            </form>
        </div>
    )
}
