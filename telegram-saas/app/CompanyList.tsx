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
            if (result.success) window.location.reload()
        } catch (err) {
            console.error("Client Error:", err)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir esta empresa?')) return
        const result = await deleteEmpresa(id)
        if (result.success) setCompanies(companies.filter(c => c.id !== id))
    }

    return (
        <div className="space-y-4">
            <div className="space-y-1">
                {companies && companies.length > 0 ? (
                    companies.map((c) => (
                        <div key={c.id} className="group flex items-center justify-between rounded-md border border-transparent hover:border-[#E2E4E6] hover:bg-gray-50/50 p-2 transition-all">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="h-8 w-8 flex-shrink-0 bg-white border border-[#E2E4E6] rounded flex items-center justify-center overflow-hidden">
                                    {c.logo_url ? (
                                        <img src={c.logo_url} className="h-full w-full object-cover" />
                                    ) : (
                                        <Building2 className="h-3.5 w-3.5 text-[#90949C]" />
                                    )}
                                </div>
                                <span className="truncate font-bold text-[11px] text-black uppercase tracking-tight">{c.nome}</span>
                            </div>

                            <div className="flex items-center">
                                <a
                                    href={`/empresa/${c.id}`}
                                    className="p-1.5 text-[#90949C] hover:text-black"
                                >
                                    <ChevronRight className="h-3.5 w-3.5" />
                                </a>
                                <button
                                    onClick={() => handleDelete(c.id)}
                                    className="p-1.5 text-[#C0C4C9] hover:text-red-500"
                                >
                                    <Trash2 className="h-3 w-3" />
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="py-6 text-center border border-dashed border-[#E2E4E6] rounded-md">
                        <p className="text-[9px] text-[#90949C] font-bold uppercase tracking-widest">NENHUMA MARCA</p>
                    </div>
                )}
            </div>

            {!isAdding ? (
                <button
                    onClick={() => setIsAdding(true)}
                    className="w-full mt-4 flex items-center justify-center gap-2 py-2 border border-dashed border-[#E2E4E6] rounded-md text-[9px] font-bold uppercase tracking-widest text-[#90949C] hover:border-black hover:text-black transition-all"
                >
                    <Plus className="h-3 w-3" />
                    NOVA MARCA
                </button>
            ) : (
                <form onSubmit={handleCreate} className="mt-4 border border-[#E2E4E6] p-3 rounded-md bg-gray-50/30 space-y-2 animate-in slide-in-from-top-1">
                    <input
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="NOME"
                        className="w-full bg-white border border-[#E2E4E6] rounded px-3 py-1.5 text-[10px] font-bold uppercase outline-none focus:border-black"
                        autoFocus
                        required
                    />
                    <div className="flex gap-1.5">
                        <button type="submit" className="flex-1 py-1.5 rounded bg-black text-white text-[9px] font-bold uppercase hover:bg-neutral-800 transition-all">SALVAR</button>
                        <button type="button" onClick={() => setIsAdding(false)} className="px-3 py-1.5 rounded bg-white border border-[#E2E4E6] text-[9px] font-bold text-[#90949C] uppercase hover:bg-gray-50 transition-all">X</button>
                    </div>
                </form>
            )}
        </div>
    )
}
