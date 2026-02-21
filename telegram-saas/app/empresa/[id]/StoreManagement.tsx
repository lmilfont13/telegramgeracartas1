'use client'

import { useState } from 'react'
import { Store, Plus, Trash2, Save, AlertCircle, CheckCircle2 } from 'lucide-react'
import { updateCompanyLojas } from './upload-actions'

interface StoreManagementProps {
    empresaId: string
    initialLojas: string[]
}

export default function StoreManagement({ empresaId, initialLojas }: StoreManagementProps) {
    const [lojas, setLojas] = useState<string[]>(initialLojas || [])
    const [newStore, setNewStore] = useState('')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    const handleAddStore = (e: React.FormEvent) => {
        e.preventDefault()
        if (!newStore.trim()) return
        if (lojas.includes(newStore.trim())) {
            setMessage({ type: 'error', text: 'Esta loja já está na lista.' })
            return
        }
        setLojas([...lojas, newStore.trim()])
        setNewStore('')
        setMessage(null)
    }

    const handleRemoveStore = (storeToRemove: string) => {
        setLojas(lojas.filter(s => s !== storeToRemove))
    }

    const handleSave = async () => {
        setLoading(true)
        setMessage(null)

        const formData = new FormData()
        formData.append('empresa_id', empresaId)
        formData.append('lojas', JSON.stringify(lojas))

        try {
            const result = await updateCompanyLojas(formData)
            if (result.error) {
                setMessage({ type: 'error', text: result.error })
            } else if (result.success) {
                setMessage({ type: 'success', text: result.success })
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Erro ao salvar alterações.' })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
            <div className="flex items-center gap-4 mb-6">
                <div className="h-12 w-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
                    <Store className="h-6 w-6" />
                </div>
                <div className="flex-1">
                    <h3 className="font-bold text-gray-900 uppercase tracking-tight">Lista de Lojas Predefinidas</h3>
                    <p className="text-sm text-gray-500 font-medium font-outfit uppercase tracking-tighter">Cadastre as lojas que aparecerão como botões no Telegram.</p>
                </div>
            </div>

            <form onSubmit={handleAddStore} className="flex gap-2 mb-6">
                <input
                    type="text"
                    value={newStore}
                    onChange={(e) => setNewStore(e.target.value)}
                    placeholder="NOME DA LOJA (EX: LOJA CENTRO)"
                    className="flex-1 rounded-xl border-2 border-gray-100 bg-gray-50 p-3 text-xs font-black text-gray-950 placeholder:text-gray-300 outline-none focus:border-blue-600 focus:bg-white transition-all uppercase tracking-widest"
                />
                <button
                    type="submit"
                    className="bg-gray-950 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all flex items-center gap-2 active:scale-95"
                >
                    <Plus className="h-4 w-4 stroke-[3]" />
                    ADICIONAR
                </button>
            </form>

            <div className="space-y-2 mb-8">
                {lojas.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {lojas.map((store, index) => (
                            <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-100 group hover:border-blue-200 transition-all">
                                <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">{store}</span>
                                <button
                                    onClick={() => handleRemoveStore(store)}
                                    className="p-1.5 text-gray-300 hover:text-red-600 transition-colors"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100">
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Nenhuma loja cadastrada</p>
                    </div>
                )}
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-gray-50">
                <div className="flex-1 pr-4">
                    {message && (
                        <div className={`flex items-center gap-2 ${message.type === 'error' ? 'text-red-600' : 'text-green-600'} animate-in fade-in slide-in-from-left-2`}>
                            {message.type === 'error' ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                            <span className="text-[10px] font-black uppercase tracking-widest">{message.text}</span>
                        </div>
                    )}
                </div>
                <button
                    onClick={handleSave}
                    disabled={loading}
                    className="bg-blue-600 text-white px-8 py-3.5 rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-lg shadow-blue-200 hover:bg-blue-700 hover:shadow-blue-300 disabled:opacity-50 transition-all flex items-center gap-3 active:scale-95"
                >
                    <Save className="h-5 w-5" />
                    {loading ? 'SALVANDO...' : 'SALVAR ALTERAÇÕES'}
                </button>
            </div>
        </div>
    )
}
