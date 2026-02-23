'use client'

import { useState } from 'react'
import { createEmpresa, deleteEmpresa } from './actions'
import { Building2, Plus, Trash2, Settings, ChevronRight } from 'lucide-react'

interface Empresa {
    id: string
    nome: string
    logo_url?: string
    criado_em: string
    lojas?: any
}

export default function CompanyList({ initialCompanies }: { initialCompanies: Empresa[] }) {
    const [companies, setCompanies] = useState(initialCompanies)
    const [isAdding, setIsAdding] = useState(false)
    const [newName, setNewName] = useState('')

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newName.trim()) return

        const formData = new FormData()
        formData.append('nome', newName)

        try {
            const result = await createEmpresa(formData)
            if (result.success) {
                window.location.reload()
            }
        } catch (err) {
            console.error("Client Error:", err)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir esta empresa?')) return
        const result = await deleteEmpresa(id)
        if (result.success) {
            setCompanies(companies.filter(c => c.id !== id))
        }
    }

    return (
        <div className="space-y-6">
            <div className="grid gap-4">
                {companies && companies.length > 0 ? (
                    companies.map((c) => (
                        <div key={c.id} className="group relative flex items-center justify-between rounded-2xl border border-gray-50 bg-white p-5 transition-all hover:bg-gray-50/50 hover:shadow-xl hover:shadow-gray-200/40 duration-300">
                            <div className="flex items-center gap-5 overflow-hidden">
                                <div className="h-12 w-12 flex-shrink-0 bg-gray-50 rounded-xl flex items-center justify-center text-gray-950 font-black border border-gray-100 group-hover:bg-gray-950 group-hover:text-white transition-all duration-500 overflow-hidden text-[10px] uppercase shadow-sm">
                                    {c.logo_url ? (
                                        <img src={c.logo_url} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                    ) : (
                                        <Building2 className="h-5 w-5 stroke-[2]" />
                                    )}
                                </div>
                                <div className="flex flex-col overflow-hidden">
                                    <span className="truncate font-black text-sm text-gray-950 tracking-tight uppercase">{c.nome}</span>
                                    <div className="flex items-center gap-3 mt-1">
                                        <span className="text-[8px] text-gray-400 font-black uppercase tracking-[0.2em] px-1.5 py-0.5 bg-gray-50 rounded border border-gray-100">Verified Brand</span>
                                        {c.lojas && (c.lojas as string[]).length > 0 && (
                                            <span className="text-[8px] text-gray-950 font-black bg-white border border-gray-200 px-1.5 py-0.5 rounded uppercase tracking-[0.2em] shadow-sm">
                                                {(c.lojas as string[]).length} {(c.lojas as string[]).length === 1 ? 'Asset' : 'Assets'}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 pr-2">
                                <a
                                    href={`/empresa/${c.id}`}
                                    className="flex items-center gap-2 px-4 py-2 bg-gray-950 text-white hover:bg-gray-800 rounded-xl transition-all text-[9px] font-black uppercase tracking-widest shadow-lg shadow-gray-200"
                                    title="Manage Identity"
                                >
                                    <Settings className="h-3 w-3" />
                                    Config
                                </a>
                                <button
                                    onClick={() => handleDelete(c.id)}
                                    className="p-2 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-300"
                                    title="Deregister"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="py-20 text-center bg-gray-50/50 rounded-[32px] border border-dashed border-gray-200">
                        <Building2 className="h-10 w-10 text-gray-200 mx-auto mb-4" />
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.3em]">No registered entities</p>
                    </div>
                )}
            </div>

            {!isAdding ? (
                <button
                    onClick={() => setIsAdding(true)}
                    className="group w-full flex items-center justify-center gap-3 py-4 border-2 border-dashed border-gray-100 rounded-[20px] text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 hover:border-gray-950 hover:text-gray-950 transition-all bg-transparent active:scale-[0.98]"
                >
                    <Plus className="h-4 w-4 stroke-[3] transition-transform group-hover:rotate-90" />
                    Register Identity
                </button>
            ) : (
                <form onSubmit={handleCreate} className="bg-white p-8 rounded-[24px] border border-gray-950 shadow-2xl animate-in zoom-in-95 duration-300">
                    <h3 className="text-[10px] font-black mb-6 text-gray-950 uppercase tracking-[0.3em] flex items-center gap-2">
                        <div className="h-1.5 w-1.5 bg-gray-950 rounded-full"></div>
                        Register New Brand
                    </h3>
                    <div className="flex flex-col gap-4">
                        <input
                            autoFocus
                            placeholder="CORP NAME / BRAND"
                            className="w-full rounded-2xl border border-transparent bg-gray-50 p-4 text-[10px] font-black text-gray-950 outline-none focus:border-gray-950 focus:bg-white transition-all tracking-[0.2em] uppercase placeholder:opacity-50"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                        />
                        <div className="flex gap-2">
                            <button type="submit" className="flex-1 bg-gray-950 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-gray-800 transition-all shadow-xl shadow-gray-200">CONFIRM</button>
                            <button type="button" onClick={() => setIsAdding(false)} className="px-6 bg-gray-100 text-gray-400 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:text-gray-950 transition-all">ABORT</button>
                        </div>
                    </div>
                </form>
            )}
        </div>
    )
}
