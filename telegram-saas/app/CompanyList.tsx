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
            <div className="grid gap-3">
                {companies && companies.length > 0 ? (
                    companies.map((c) => (
                        <div key={c.id} className="group flex items-center justify-between rounded-2xl border border-gray-50 bg-white p-4 transition-all hover:border-black duration-500">
                            <div className="flex items-center gap-4 overflow-hidden">
                                <div className="h-12 w-12 flex-shrink-0 bg-gray-50 rounded-xl flex items-center justify-center text-black font-black border border-gray-100 group-hover:bg-black group-hover:text-white transition-all duration-500 overflow-hidden">
                                    {c.logo_url ? (
                                        <img src={c.logo_url} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                    ) : (
                                        <Building2 className="h-5 w-5 stroke-[2]" />
                                    )}
                                </div>
                                <div className="flex flex-col overflow-hidden">
                                    <span className="truncate font-black text-[13px] text-black tracking-tight uppercase">{c.nome}</span>
                                    <span className="text-[8px] text-gray-400 font-black uppercase tracking-[0.2em] mt-0.5">MARCA ATIVA</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-1">
                                <a
                                    href={`/empresa/${c.id}`}
                                    className="p-2.5 text-black hover:bg-gray-50 rounded-lg transition-all"
                                    title="Gerenciar"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </a>
                                <button
                                    onClick={() => handleDelete(c.id)}
                                    className="p-2.5 text-gray-200 hover:text-black transition-all"
                                    title="Excluir"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="py-12 text-center bg-gray-50/50 rounded-[32px] border border-dashed border-gray-100">
                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-[0.3em]">Nenhuma marca encontrada</p>
                    </div>
                )}
            </div>

            {!isAdding ? (
                <button
                    onClick={() => setIsAdding(true)}
                    className="w-full flex items-center justify-center gap-3 py-4.5 border-2 border-dashed border-gray-100 rounded-[24px] text-[10px] font-black uppercase tracking-[0.25em] text-gray-300 hover:border-black hover:text-black transition-all bg-white group"
                >
                    <Plus className="h-4 w-4 group-hover:scale-110 transition-transform" />
                    NOVA MARCA
                </button>
            ) : (
                <form onSubmit={handleCreate} className="bg-gray-50/50 p-6 rounded-[32px] border border-black space-y-4 animate-in zoom-in-95 duration-300">
                    <input
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="NOME DA EMPRESA"
                        className="w-full p-4.5 rounded-2xl bg-white border border-transparent focus:border-black outline-none text-[10px] font-black uppercase tracking-widest shadow-sm"
                        autoFocus
                        required
                    />
                    <div className="flex gap-2">
                        <button type="submit" className="flex-1 py-4.5 rounded-2xl bg-black text-white text-[10px] font-black uppercase tracking-widest hover:bg-neutral-800 transition-all">SALVAR</button>
                        <button type="button" onClick={() => setIsAdding(false)} className="px-6 py-4.5 rounded-2xl bg-white border border-gray-200 text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition-all">CANCELAR</button>
                    </div>
                </form>
            )}
        </div>
    )
}
