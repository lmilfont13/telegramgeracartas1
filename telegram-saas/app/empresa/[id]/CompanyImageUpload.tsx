'use client'

import { useState, useRef, useEffect } from 'react'
import { Upload, CheckCircle2, AlertCircle } from 'lucide-react'

interface CompanyImageUploadProps {
    empresaId: string
    currentUrl?: string | null
    label: string
    description: string
    action: (formData: FormData) => Promise<{ error?: string; success?: string }>
    onClear?: (formData: FormData) => Promise<{ error?: string; success?: string }>
    fieldName: string
    buttonColor?: string
}

export default function CompanyImageUpload({
    empresaId,
    currentUrl,
    label,
    description,
    action,
    onClear,
    fieldName,
    buttonColor = 'bg-blue-600'
}: CompanyImageUploadProps) {
    const [preview, setPreview] = useState<string | null>(currentUrl || null)
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Sincroniza o preview quando a prop currentUrl mudar (ex: após revalidação do servidor)
    useEffect(() => {
        setPreview(currentUrl || null)
    }, [currentUrl])

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
        console.log(`[Client] Submitting file for ${fieldName}...`)
        if (!fileInputRef.current?.files?.[0]) {
            setMessage({ type: 'error', text: 'Nenhum arquivo selecionado.' })
            return
        }

        const formData = new FormData()
        formData.append('empresa_id', empresaId)
        formData.append(fieldName, fileInputRef.current.files[0])

        setLoading(true)
        setMessage(null)

        try {
            console.log(`[Client] Calling server action for ${fieldName}...`)
            const result = await action(formData)
            console.log(`[Client] Result for ${fieldName}:`, result)
            if (result.error) {
                setMessage({ type: 'error', text: result.error })
            } else if (result.success) {
                setMessage({ type: 'success', text: result.success })
                // O servidor vai revalidar e trocar a prop currentUrl
            }
        } catch (err: any) {
            console.error(`[Client] Error for ${fieldName}:`, err)
            setMessage({ type: 'error', text: 'Erro na conexão com o servidor.' })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="rounded-xl border bg-white p-6 transition-shadow border-gray-100">
            <h3 className="text-[10px] font-bold mb-4 flex items-center gap-2 uppercase tracking-widest text-gray-400">
                <div className={`h-1.5 w-1.5 rounded-full bg-gray-950`}></div>
                {label}
            </h3>
            <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="flex h-24 w-24 items-center justify-center rounded-lg border border-gray-100 bg-gray-50 overflow-hidden relative group shrink-0">
                    {preview ? (
                        <img src={preview} alt="Preview" className="h-full w-full object-contain p-2" />
                    ) : (
                        <div className="flex flex-col items-center text-gray-300">
                            <Upload className="h-4 w-4 mb-1" />
                            <span className="text-[8px] font-bold uppercase tracking-wider">Empty</span>
                        </div>
                    )}
                    {currentUrl && !loading && !message && (
                        <div className="absolute top-1 right-1 bg-gray-950 text-white rounded-full p-0.5 shadow-sm border border-white">
                            <CheckCircle2 className="h-2.5 w-2.5" />
                        </div>
                    )}
                    {loading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-950 border-t-transparent"></div>
                        </div>
                    )}
                </div>

                <div className="flex-1 w-full">
                    <p className="text-xs text-gray-500 mb-4 leading-relaxed font-medium">
                        {description}
                    </p>
                    <form onSubmit={handleSubmit} className="space-y-3">
                        <input type="hidden" name="empresa_id" value={empresaId} />
                        <div className="flex flex-col sm:flex-row gap-2">
                            <div className="flex-1 relative">
                                <input
                                    type="file"
                                    name={fieldName}
                                    accept="image/*"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    className="block w-full text-xs text-gray-500 file:mr-4 file:rounded-lg file:border-0 file:bg-gray-100 file:px-4 file:py-2 file:text-xs file:font-bold file:text-gray-700 hover:file:bg-gray-200 cursor-pointer"
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className={`rounded-lg bg-gray-950 px-4 py-2 text-[10px] font-bold text-white hover:bg-gray-800 disabled:opacity-50 transition-all flex items-center justify-center gap-2 whitespace-nowrap uppercase tracking-widest`}
                            >
                                {loading ? 'SENDING...' : (currentUrl ? 'UPDATE' : 'UPLOAD')}
                            </button>

                            {currentUrl && onClear && (
                                <button
                                    type="button"
                                    onClick={async () => {
                                        if (confirm('Deseja remover esta imagem?')) {
                                            const fd = new FormData()
                                            fd.append('empresa_id', empresaId)
                                            fd.append('field', fieldName === 'logo' ? 'logo_url' : fieldName === 'carimbo' ? 'carimbo_url' : 'carimbo_funcionario_url')
                                            setLoading(true)
                                            await onClear(fd)
                                            setLoading(false)
                                            setPreview(null)
                                        }
                                    }}
                                    className="bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-600 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                                >
                                    Remover
                                </button>
                            )}
                        </div>
                        {message && (
                            <div className={`flex items-center gap-2 p-3 rounded-xl border ${message.type === 'error' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-600 border-green-100'} animate-in fade-in slide-in-from-top-2 duration-300`}>
                                {message.type === 'error' ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-5 w-5" />}
                                <div className="flex flex-col">
                                    <p className="text-xs font-black uppercase tracking-tight">
                                        {message.type === 'error' ? 'Erro no Upload' : 'Salvo com Sucesso!'}
                                    </p>
                                    <p className="text-[10px] font-medium opacity-80">
                                        {message.text}
                                    </p>
                                </div>
                            </div>
                        )}
                    </form>
                </div>
            </div>
        </div>
    )
}
