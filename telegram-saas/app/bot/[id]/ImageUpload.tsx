'use client'

import { useState, useRef } from 'react'

interface ImageUploadProps {
    botId: string
    currentUrl?: string | null
    label: string
    description: string
    action: (formData: FormData) => Promise<{ error?: string; success?: string }>
    fieldName: string
    buttonColor?: string
}

export default function ImageUpload({
    botId,
    currentUrl,
    label,
    description,
    action,
    fieldName,
    buttonColor = 'bg-blue-600'
}: ImageUploadProps) {
    const [preview, setPreview] = useState<string | null>(currentUrl || null)
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            const url = URL.createObjectURL(file)
            setPreview(url)
            setMessage(null)
        }
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)

        setLoading(true)
        setMessage(null)

        try {
            const result = await action(formData)
            if (result.error) {
                setMessage({ type: 'error', text: result.error })
            } else {
                setMessage({ type: 'success', text: result.success || 'Upload concluído!' })
                // O revalidatePath no servidor cuidará de atualizar a URL real
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Falha na conexão.' })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">{label}</h2>
            <div className="flex items-center gap-6">
                <div className="flex h-32 w-32 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 overflow-hidden relative">
                    {preview ? (
                        <img src={preview} alt="Preview" className="max-h-full max-w-full object-contain" />
                    ) : (
                        <span className="text-xs text-gray-400">Sem Imagem</span>
                    )}
                    {loading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/50">
                            <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
                        </div>
                    )}
                </div>
                <div className="flex-1">
                    <p className="text-sm text-gray-500 mb-2">
                        {description}
                    </p>
                    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
                        <input type="hidden" name="bot_id" value={botId} />
                        <div className="flex gap-2">
                            <input
                                type="file"
                                name={fieldName}
                                accept="image/*"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                className="block flex-1 text-sm text-gray-500 file:mr-4 file:rounded-full file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
                                required
                            />
                            <button
                                type="submit"
                                disabled={loading}
                                className={`rounded ${buttonColor} px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-50 transition-all`}
                            >
                                {loading ? 'Enviando...' : 'Upload'}
                            </button>
                        </div>
                        {message && (
                            <p className={`text-xs mt-1 ${message.type === 'error' ? 'text-red-500' : 'text-green-600'}`}>
                                {message.text}
                            </p>
                        )}
                    </form>
                </div>
            </div>
        </div>
    )
}
