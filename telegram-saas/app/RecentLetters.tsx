'use client'

import { useState } from 'react'
import { deleteLetter } from './actions'
import { FileText, Trash2, Download, User, Calendar, ExternalLink } from 'lucide-react'

interface Letter {
    id: string
    funcionario_id: string
    template_id: string
    pdf_url: string
    criado_em: string
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
        <div className="space-y-4">
            {letters.length > 0 ? (
                <div className="grid gap-4">
                    {letters.map((letter) => (
                        <div key={letter.id} className="group relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-gray-100 bg-gray-50/30 p-5 hover:bg-white hover:border-blue-100 hover:shadow-xl hover:shadow-blue-500/5 transition-all">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-2xl bg-white border border-gray-100 flex items-center justify-center text-blue-600 shadow-sm group-hover:bg-blue-600 group-hover:text-white group-hover:border-transparent transition-all">
                                    <FileText className="h-6 w-6 stroke-[2.5]" />
                                </div>
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2 mb-1">
                                        <User className="h-3 w-3 text-gray-400" />
                                        <span className="font-black text-sm text-gray-950 uppercase tracking-tight">Funcionário ID: {letter.funcionario_id.slice(0, 8)}...</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                            <Calendar className="h-3 w-3" />
                                            {new Date(letter.criado_em).toLocaleDateString()} {new Date(letter.criado_em).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                        <span className="h-1 w-1 rounded-full bg-gray-200"></span>
                                        <span className="text-[10px] text-blue-600 font-black uppercase tracking-widest">PDF GERADO</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 sm:self-center">
                                <a
                                    href={letter.pdf_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-950 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-950 hover:text-white hover:border-gray-950 transition-all shadow-sm active:scale-95"
                                >
                                    <Download className="h-3.5 w-3.5 stroke-[3]" />
                                    BAIXAR
                                </a>
                                <button
                                    onClick={() => handleDelete(letter.id, letter.pdf_url)}
                                    className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                    title="Excluir Registro"
                                >
                                    <Trash2 className="h-4 w-4 stroke-[2.5]" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="py-12 text-center bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-100">
                    <History className="h-8 w-8 text-gray-200 mx-auto mb-3" />
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Sem registros recentes</p>
                </div>
            )}

            {letters.length > 0 && (
                <button className="w-full py-3 text-[10px] font-black text-gray-400 hover:text-blue-600 uppercase tracking-[0.2em] transition-colors">
                    VER TODO O HISTÓRICO
                </button>
            )}
        </div>
    )
}
