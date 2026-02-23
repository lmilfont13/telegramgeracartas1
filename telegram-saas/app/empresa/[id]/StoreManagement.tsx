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

        // Split by comma, trim each, and filter out empty strings
        const addedStores = newStore.split(',').map(s => s.trim()).filter(s => s !== '')

        const updatedLojas = [...lojas]
        let hasDuplicate = false

        addedStores.forEach(store => {
            if (!updatedLojas.includes(store)) {
                updatedLojas.push(store)
            } else {
                hasDuplicate = true
            }
        })

        setLojas(updatedLojas)
        setNewStore('')

        if (hasDuplicate && addedStores.length === 1) {
            setMessage({ type: 'error', text: 'Esta loja já está na lista.' })
        } else {
            setMessage(null)
        }
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
        <div className="bg-white rounded-xl border border-gray-100 p-6">
            <div className="flex items-center gap-4 mb-6">
                <div className="h-10 w-10 bg-gray-50 text-gray-950 rounded-lg flex items-center justify-center shrink-0 border border-gray-100">
                    <Store className="h-5 w-5" />
                </div>
                <div className="flex-1">
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-tight">Predefined Stores</h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Register stores that will appear as buttons in Telegram.</p>
                </div>
            </div>

            <form onSubmit={handleAddStore} className="flex gap-2 mb-6">
                <input
                    type="text"
                    value={newStore}
                    onChange={(e) => setNewStore(e.target.value)}
                    placeholder="STORE NAMES (EX: STORE 1, STORE 2)"
                    className="flex-1 rounded-lg border border-gray-200 bg-gray-50 p-3 text-[10px] font-bold text-gray-950 placeholder:text-gray-300 outline-none focus:border-gray-950 transition-all uppercase tracking-widest"
                />
                <button
                    type="submit"
                    className="bg-gray-950 text-white px-5 py-3 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-gray-800 transition-all flex items-center gap-2 active:scale-95"
                >
                    <Plus className="h-3.5 w-3.5 stroke-[3]" />
                    ADD
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

            <div className="flex items-center justify-between pt-6 border-t border-gray-100">
                <div className="flex-1 pr-4">
                    {message && (
                        <div className={`flex items-center gap-2 ${message.type === 'error' ? 'text-red-600' : 'text-gray-950'} animate-in fade-in slide-in-from-left-2`}>
                            {message.type === 'error' ? <AlertCircle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                            <span className="text-[10px] font-bold uppercase tracking-widest">{message.text}</span>
                        </div>
                    )}
                </div>
                <button
                    onClick={handleSave}
                    disabled={loading}
                    className="bg-gray-950 text-white px-6 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-gray-800 disabled:opacity-50 transition-all flex items-center gap-2 active:scale-95"
                >
                    <Save className="h-3.5 w-3.5" />
                    {loading ? 'SAVING...' : 'SAVE CHANGES'}
                </button>
            </div>
        </div>
    )
}
