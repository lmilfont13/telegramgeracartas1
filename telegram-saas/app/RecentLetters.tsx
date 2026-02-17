
'use client'

import { useState } from 'react'
import { deleteCarta } from './actions'
import { FileText, Trash2 } from 'lucide-react'

interface Carta {
    id: string
    nome_arquivo: string
    nome_funcionario: string
    data_geracao: string
}

export default function RecentLetters({ initialLetters }: { initialLetters: Carta[] }) {
    const [letters, setLetters] = useState(initialLetters)

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja apagar este registro do histórico?')) return;

        const result = await deleteCarta(id)
        if (result.success) {
            setLetters(letters.filter(l => l.id !== id))
        } else {
            alert("Erro ao excluir!")
        }
    }

    return (
        <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Funcionário</th>
                        <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Arquivo</th>
                        <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Data</th>
                        <th className="px-5 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Ação</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                    {letters?.map((c) => (
                        <tr key={c.id} className="hover:bg-gray-50 transition-colors group">
                            <td className="px-5 py-3 text-sm font-semibold text-gray-900">{c.nome_funcionario}</td>
                            <td className="px-5 py-3">
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                    <FileText className="h-4 w-4 text-gray-400" />
                                    {c.nome_arquivo}
                                </div>
                            </td>
                            <td className="px-5 py-3 text-sm text-gray-400">
                                {new Date(c.data_geracao).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="px-5 py-3 text-right">
                                <button
                                    onClick={() => handleDelete(c.id)}
                                    className="text-gray-300 hover:text-red-500 p-1 rounded-md hover:bg-red-50 transition-colors"
                                    title="Excluir do Histórico"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </td>
                        </tr>
                    ))}
                    {(!letters || letters.length === 0) && (
                        <tr><td colSpan={4} className="px-5 py-8 text-center text-sm text-gray-400 italic">Nenhuma carta gerada ainda.</td></tr>
                    )}
                </tbody>
            </table>
        </div>
    )
}
