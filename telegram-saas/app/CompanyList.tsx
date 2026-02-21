'use client'

import { useState } from 'react'
import { createEmpresa, deleteEmpresa } from './actions'
import { Building2, Plus, Trash2, Settings, ChevronRight } from 'lucide-react'

interface Empresa {
    id: string
    nome: string
    logo_url?: string
    criado_em: string
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
        <div className="space-y-4">
            <div className="grid gap-3">
                {companies && companies.length > 0 ? (
                    companies.map((c) => (
                        <div key={c.id} className="group relative flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-4 shadow-sm hover:shadow-xl hover:shadow-blue-500/5 transition-all">
                            <div className="flex items-center gap-4 overflow-hidden">
                                <div className="h-12 w-12 flex-shrink-0 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-950 font-black border-2 border-transparent group-hover:border-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all overflow-hidden">
                                    {c.logo_url ? (
                                        <img src={c.logo_url} className="h-full w-full object-cover" />
                                    ) : (
                                        <Building2 className="h-6 w-6 stroke-[2.5]" />
                                    )}
                                </div>
                                <div className="flex flex-col overflow-hidden">
                                    <span className="truncate font-black text-sm text-gray-950 uppercase tracking-tighter">{c.nome}</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[9px] text-blue-600 font-black uppercase tracking-widest">MARCA ATIVA</span>
                                        {c.lojas && (c.lojas as string[]).length > 0 && (
                                            <span className="text-[9px] text-gray-400 font-black bg-gray-50 border border-gray-100 px-1.5 py-0.5 rounded uppercase tracking-widest">
                                                {(c.lojas as string[]).length} {(c.lojas as string[]).length === 1 ? 'Loja' : 'Lojas'}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                <a
                                    href={`/empresa/${c.id}`}
                                    className="flex items-center gap-2 px-3 py-2 bg-gray-50 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all border border-gray-100 text-[10px] font-bold uppercase tracking-widest"
                                    title="Configurar Marca e Lojas"
                                >
                                    <Settings className="h-3.5 w-3.5" />
                                    CONFIGURAR
                                </a>
                                <button
                                    onClick={() => handleDelete(c.id)}
                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all border border-transparent"
                                    title="Excluir Empresa"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                                <div className="ml-1 text-gray-200">
                                    <ChevronRight className="h-4 w-4" />
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="py-12 text-center bg-gray-50 rounded-[28px] border-2 border-dashed border-gray-200">
                        <Building2 className="h-8 w-8 text-gray-200 mx-auto mb-3" />
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Nenhuma empresa</p>
                    </div>
                )}
            </div>

            {!isAdding ? (
                <button
                    onClick={() => setIsAdding(true)}
                    className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-gray-200 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 hover:border-blue-600/50 hover:text-blue-600 transition-all bg-transparent active:scale-[0.98]"
                >
                    <Plus className="h-4 w-4 stroke-[3]" />
                    NOVA MARCA
                </button>
            ) : (
                <form onSubmit={handleCreate} className="bg-white p-5 rounded-2xl border-2 border-blue-600 shadow-xl shadow-blue-500/10 animate-in zoom-in-95">
                    <h3 className="text-[10px] font-black mb-4 text-blue-600 uppercase tracking-widest">Cadastrar Empresa</h3>
                    <div className="flex flex-col gap-3">
                        <input
                            autoFocus
                            placeholder="NOME DA EMPRESA"
                            className="w-full rounded-xl border-2 border-gray-100 bg-gray-50 p-3.5 text-xs font-black text-gray-950 placeholder:text-gray-300 outline-none focus:border-blue-600 focus:bg-white transition-all uppercase tracking-widest"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                        />
                        <div className="flex gap-2">
                            <button type="submit" className="flex-1 bg-blue-600 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 active:scale-95 transition-all">SALVAR</button>
                            <button type="button" onClick={() => setIsAdding(false)} className="px-5 bg-gray-100 text-gray-400 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:text-gray-600 transition-all">CANCELAR</button>
                        </div>
                    </div>
                </form>
            )}
        </div>
    )
}
