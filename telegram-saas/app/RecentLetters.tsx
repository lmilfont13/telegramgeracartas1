'use client'

import { useState } from 'react'
import { deleteLetter } from './actions'
import { FileText, Trash2, ChevronRight, User, Calendar } from 'lucide-react'

interface Letter {
    id: string
    funcionario_id: string
    template_id: string
    pdf_url: string
    criado_em: string
    criado_por_nome?: string
    criado_por_user?: string
}

export default function RecentLetters({ initialLetters }: { initialLetters: Letter[] }) {
    const [letters, setLetters] = useState(initialLetters)

    const handleDelete = async (id: string, pdfUrl: string) => {
        if (!confirm('Deseja excluir este registro?')) return
        const result = await deleteLetter(id, pdfUrl)
        if (result.success) setLetters(letters.filter(l => l.id !== id))
    }

    return (
        <div className="w-full">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="border-b border-[#E2E4E6] bg-gray-50/50">
                        <th className="px-6 py-3 text-[9px] font-bold text-[#90949C] uppercase tracking-widest">DADOS DO DOCUMENTO</th>
                        <th className="px-6 py-3 text-[9px] font-bold text-[#90949C] uppercase tracking-widest text-center">USUÁRIO</th>
                        <th className="px-6 py-3 text-[9px] font-bold text-[#90949C] uppercase tracking-widest text-right">AÇÕES</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-[#F0F2F4]">
                    {letters.map((letter) => (
                        <tr key={letter.id} className="hover:bg-gray-50/50 transition-colors group">
                            <td className="px-6 py-3">
                                <div className="flex items-center gap-3">
                                    <FileText className="h-3.5 w-3.5 text-[#C0C4C9]" />
                                    <div className="flex flex-col">
                                        <span className="text-[11px] font-bold text-black uppercase tracking-tight">CARTA_{letter.id.slice(0, 8)}</span>
                                        <span className="text-[9px] text-[#90949C]">{new Date(letter.criado_em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-3 text-center">
                                <span className="text-[10px] font-bold text-[#60646C] uppercase tracking-wider bg-gray-100 px-2 py-0.5 rounded">
                                    {letter.criado_por_user || letter.funcionario_id.slice(0, 8)}
                                </span>
                            </td>
                            <td className="px-6 py-3 text-right">
                                <div className="flex items-center justify-end gap-1">
                                    <a
                                        href={letter.pdf_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-1.5 text-gray-400 hover:text-black transition-colors"
                                        title="Visualizar"
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </a>
                                    <button
                                        onClick={() => handleDelete(letter.id, letter.pdf_url)}
                                        className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                                        title="Excluir"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {letters.length === 0 && (
                <div className="py-20 text-center">
                    <p className="text-[10px] font-bold text-[#90949C] uppercase tracking-[0.2em]">Nenhuma atividade registrada</p>
                </div>
            )}

            <div className="p-4 border-t border-[#E2E4E6] bg-gray-50/30 flex justify-center">
                <button className="text-[9px] font-bold text-[#90949C] hover:text-black uppercase tracking-[0.2em] transition-colors flex items-center gap-2">
                    CARREGAR MAIS REGISTROS <ChevronRight className="h-3 w-3" />
                </button>
            </div>
        </div>
    )
}
