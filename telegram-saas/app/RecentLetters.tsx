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

    if (!letters || letters.length === 0) {
        return (
            <div className="py-12 text-center bg-gray-50/50 rounded-[32px] border border-dashed border-gray-100">
                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-[0.3em]">No activity recorded</p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {letters.map((letter) => (
                <div key={letter.id} className="group flex items-center justify-between p-5 rounded-[24px] border border-gray-50 bg-white transition-all hover:border-black duration-500">
                    <div className="flex items-center gap-5 overflow-hidden">
                        <div className="h-12 w-12 flex-shrink-0 bg-gray-50 rounded-2xl flex items-center justify-center text-black border border-gray-100 group-hover:bg-black group-hover:text-white transition-all duration-500">
                            <FileText className="h-5 w-5 stroke-[1.5]" />
                        </div>
                        <div className="flex flex-col overflow-hidden">
                            <span className="truncate font-black text-[13px] text-black tracking-tight uppercase">CARTA_{letter.id.slice(0, 8)}</span>
                            <div className="flex items-center gap-3 mt-1">
                                <span className="text-[8px] text-black font-black uppercase tracking-[0.2em]">{letter.criado_por_user || `USUÁRIO: ${letter.funcionario_id.slice(0, 8)}`}</span>
                                <div className="h-1 w-1 rounded-full bg-gray-300"></div>
                                <span className="text-[8px] text-gray-400 font-bold uppercase tracking-[0.2em]">{new Date(letter.criado_em).toLocaleDateString('pt-BR')}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <a
                            href={letter.pdf_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-3 text-black hover:bg-gray-50 rounded-xl transition-all border border-transparent hover:border-black/5"
                            title="Visualizar"
                        >
                            <ChevronRight className="h-5 w-5" />
                        </a>
                        <button
                            onClick={() => handleDelete(letter.id, letter.pdf_url)}
                            className="p-3 text-gray-200 hover:text-black transition-all"
                            title="Excluir"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            ))}

            <button className="w-full py-5 text-[10px] font-black text-gray-400 hover:text-black uppercase tracking-[0.4em] transition-all hover:bg-gray-50 rounded-[24px] border-2 border-dashed border-gray-100 mt-6">
                ACESSAR HISTÓRICO COMPLETO
            </button>
        </div>
    )
}
