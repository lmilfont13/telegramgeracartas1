'use client'

import { useState } from 'react'
import { deleteLetter } from './actions'
import { FileText, Trash2, Download, User, Calendar, History as HistoryIcon } from 'lucide-react'

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
        if (!confirm('Tem certeza que deseja excluir este registro e o arquivo PDF?')) return
        const result = await deleteLetter(id, pdfUrl)
        if (result.success) {
            setLetters(letters.filter(l => l.id !== id))
        } else {
            alert('Erro ao excluir: ' + result.error)
        }
    }

    return (
        <div className="space-y-6">
            {letters.length > 0 ? (
                <div className="grid gap-4">
                    {letters.map((letter) => (
                        <div key={letter.id} className="group relative flex flex-col md:flex-row md:items-center justify-between gap-6 rounded-2xl border border-gray-50 bg-white p-6 transition-all hover:bg-gray-50/50 hover:shadow-lg hover:shadow-gray-100/50 duration-300">
                            <div className="flex items-center gap-6">
                                <div className="h-14 w-14 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-950 group-hover:bg-gray-950 group-hover:text-white transition-all duration-500">
                                    <FileText className="h-6 w-6 stroke-[1.5]" />
                                </div>
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <div className="h-4 w-4 rounded-full bg-gray-100 flex items-center justify-center">
                                            <User className="h-2 w-2 text-gray-500" />
                                        </div>
                                        <span className="font-black text-[10px] text-gray-950 tracking-widest uppercase">Worker {letter.funcionario_id.slice(0, 8)}</span>
                                        {letter.criado_por_user && (
                                            <>
                                                <span className="h-1 w-1 rounded-full bg-gray-200"></span>
                                                <span className="text-[9px] text-gray-400 font-black uppercase tracking-widest">By {letter.criado_por_user}</span>
                                            </>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-1.5 text-[9px] text-gray-400 font-black uppercase tracking-[0.2em]">
                                            <Calendar className="h-3 w-3" />
                                            {new Date(letter.criado_em).toLocaleDateString('pt-BR')}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[9px] text-gray-950 font-black uppercase tracking-[0.2em] bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                                            Status: Stable
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <a
                                    href={letter.pdf_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-3 bg-white text-gray-950 border border-gray-200 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-gray-950 hover:text-white hover:border-transparent transition-all active:scale-95 shadow-sm"
                                >
                                    <Download className="h-3.5 w-3.5" />
                                    Review doc
                                </a>
                                <button
                                    onClick={() => handleDelete(letter.id, letter.pdf_url)}
                                    className="p-3 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-300"
                                    title="Excluir Registro"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="py-20 text-center bg-gray-50/50 rounded-[32px] border border-dashed border-gray-200">
                    <HistoryIcon className="h-10 w-10 text-gray-200 mx-auto mb-4" />
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.3em]">No activity detected</p>
                </div>
            )}

            {letters.length > 0 && (
                <button className="w-full py-4 text-[10px] font-black text-gray-400 hover:text-gray-950 uppercase tracking-[0.3em] transition-all hover:bg-gray-50 rounded-2xl border border-transparent hover:border-gray-100">
                    Access deep history
                </button>
            )}
        </div>
    )
}
