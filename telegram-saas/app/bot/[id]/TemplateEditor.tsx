'use client'

import { useState } from 'react'

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
        <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Modelo da Carta</h2>

            <div className="mb-6">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Variáveis Disponíveis (Clique para inserir)</p>
                <div className="flex flex-wrap gap-1.5">
                    {['nome', 'loja', 'cargo', 'rg', 'cpf', 'data', 'cdc', 'data_admissao', ...availablePlaceholders].map((ph) => (
                        <button
                            key={ph}
                            type="button"
                            onClick={() => insertPlaceholder(ph)}
                            className="px-2 py-1 bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-200 rounded-md text-[10px] font-bold text-gray-500 hover:text-blue-600 transition-all"
                        >
                            {`{{${ph.toUpperCase()}}}`}
                        </button>
                    ))}
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                <textarea
                    name="template"
                    rows={8}
                    value={template}
                    onChange={(e) => setTemplate(e.target.value)}
                    className="block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm font-mono"
                    placeholder="Escreva o modelo da carta aqui..."
                />
                <div className="mt-4 flex items-center justify-between">
                    <div>
                        {message && (
                            <p className={`text-sm ${message.type === 'error' ? 'text-red-500' : 'text-green-600'}`}>
                                {message.text}
                            </p>
                        )}
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="rounded bg-blue-600 px-6 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50 transition-all font-medium"
                    >
                        {loading ? 'Salvando...' : 'Salvar Modelo'}
                    </button>
                </div>
            </form>
        </div>
    )
}
