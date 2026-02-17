'use client'

import { useState } from 'react'
import { createEmpresa, deleteEmpresa } from './actions'
import { Building2, Plus, Trash2, Settings, ExternalLink } from 'lucide-react'

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
        console.log("Submitting new company:", newName); // DEBUG

        if (!newName.trim()) return

        const formData = new FormData()
        formData.append('nome', newName)

        try {
            const result = await createEmpresa(formData)
            console.log("Creation result:", result); // DEBUG

            if (result.success) {
                console.log("Success! Reloading..."); // DEBUG
                window.location.reload()
            } else {
                alert("Erro ao criar: " + JSON.stringify(result.error)); // DEBUG ALERT
            }
        } catch (err) {
            console.error("Client Error:", err);
            alert("Erro cliente: " + err);
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
            {!isAdding ? (
                <button
                    onClick={() => setIsAdding(true)}
                    className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm font-bold text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-all bg-white shadow-sm"
                >
                    <Plus className="h-4 w-4" />
                    Nova Empresa / Marca
                </button>
            ) : (
                <form onSubmit={handleCreate} className="bg-white p-4 rounded-xl border border-blue-200 shadow-sm animate-in fade-in slide-in-from-top-2">
                    <h3 className="text-sm font-bold mb-3 text-blue-600">Cadastrar Nova Empresa</h3>
                    <div className="flex gap-2">
                        <input
                            autoFocus
                            placeholder="Nome da Empresa"
                            className="flex-1 rounded-lg border p-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                        />
                        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700">Criar</button>
                        <button type="button" onClick={() => setIsAdding(false)} className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-200">Cancelar</button>
                    </div>
                </form>
            )}

            <div className="grid gap-3">
                {companies && companies.length > 0 ? (
                    companies.map((c) => (
                        <div key={c.id} className="group flex items-center justify-between rounded-xl border bg-white p-4 shadow-sm hover:shadow-md transition-all">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="h-10 w-10 flex-shrink-0 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 font-bold border border-blue-100">
                                    {c.logo_url ? (
                                        <img src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/logos/${c.logo_url}`} className="h-full w-full object-contain p-1" />
                                    ) : (
                                        <Building2 className="h-5 w-5" />
                                    )}
                                </div>
                                <div className="flex flex-col overflow-hidden">
                                    <span className="truncate font-bold text-sm text-gray-900 group-hover:text-blue-600 transition-colors">{c.nome}</span>
                                    <span className="text-[10px] text-gray-400 uppercase font-semibold tracking-wider">MARCA ATIVA</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <a
                                    href={`/empresa/${c.id}`}
                                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="Configurar Logo e Carimbos"
                                >
                                    <Settings className="h-4 w-4" />
                                </a>
                                <button
                                    onClick={() => handleDelete(c.id)}
                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Excluir Empresa"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="py-8 text-center bg-white rounded-xl border border-dashed border-gray-200">
                        <Building2 className="h-8 w-8 text-gray-200 mx-auto mb-2" />
                        <p className="text-sm text-gray-400">Nenhuma empresa cadastrada.</p>
                    </div>
                )}
            </div>
        </div>
    )
}
