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
        <div className="rounded-xl border bg-white p-6 border-gray-100">
            <h3 className="text-[10px] font-bold mb-4 flex items-center gap-2 uppercase tracking-widest text-gray-400">
                <div className="h-1.5 w-1.5 rounded-full bg-gray-950"></div>
                Letter Template
            </h3>

            <div className="mb-6">
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-3">Available Variables (Click to insert)</p>
                <div className="flex flex-wrap gap-1.5">
                    {['nome', 'loja', 'cargo', 'rg', 'cpf', 'data', 'cdc', 'data_admissao', ...availablePlaceholders].map((ph) => (
                        <button
                            key={ph}
                            type="button"
                            onClick={() => insertPlaceholder(ph)}
                            className="px-2 py-1 bg-gray-50 hover:bg-gray-100 border border-gray-200 hover:border-gray-950 rounded-md text-[9px] font-bold text-gray-500 hover:text-gray-950 transition-all uppercase"
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
                    className="block w-full rounded-lg border border-gray-200 p-4 text-[11px] font-mono focus:border-gray-950 outline-none transition-all bg-gray-50"
                    placeholder="Write the letter template here..."
                />
                <div className="mt-4 flex items-center justify-between">
                    <div>
                        {message && (
                            <div className={`flex items-center gap-2 mt-2 ${message.type === 'error' ? 'text-red-600' : 'text-gray-950'} animate-in fade-in slide-in-from-top-1 duration-300`}>
                                {message.type === 'error' ? <AlertCircle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                                <span className="text-[10px] font-bold uppercase tracking-widest">{message.text}</span>
                            </div>
                        )}
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-gray-950 text-white px-6 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-gray-800 disabled:opacity-50 transition-all flex items-center gap-2 active:scale-95"
                    >
                        <Save className="h-3.5 w-3.5" />
                        {loading ? 'SAVING...' : 'SAVE TEMPLATE'}
                    </button>
                </div>
            </form>
        </div>
    )
}
