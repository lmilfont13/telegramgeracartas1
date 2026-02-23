'use client'

import { useState } from 'react'
import * as XLSX from 'xlsx'
import { uploadEmployees, deleteAllEmployees } from './upload-employees'
import { FileSpreadsheet, MapIcon, CheckCircle2, Loader2, AlertCircle, Trash2 } from 'lucide-react'

interface Mapping {
    nome: string;
    loja: string;
    cargo: string;
    data_admissao: string;
}

export default function EmployeeUploadInteractive({ botId }: { botId: string }) {
    const [step, setStep] = useState(1) // 1: Seleção, 2: Mapeamento
    const [file, setFile] = useState<File | null>(null)
    const [headers, setHeaders] = useState<string[]>([])
    const [mapping, setMapping] = useState<Mapping>({
        nome: '',
        loja: '',
        cargo: '',
        data_admissao: ''
    })
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    const handleDeleteAll = async () => {
        if (!confirm('TEM CERTEZA? Isso excluirá TODOS os funcionários desta marca permanentemente.')) return

        setLoading(true)
        setMessage(null)
        try {
            const result = await deleteAllEmployees(botId)
            if ('error' in result) {
                setMessage({ type: 'error', text: result.error as string })
            } else {
                setMessage({ type: 'success', text: result.success as string })
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Erro ao excluir dados.' })
        } finally {
            setLoading(false)
        }
    }

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0]
        if (!selectedFile) return

        setFile(selectedFile)
        setLoading(true)

        try {
            const data = await selectedFile.arrayBuffer()
            const workbook = XLSX.read(data)
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][]

            if (jsonData.length > 0) {
                const sheetHeaders = jsonData[0].map(h => String(h).trim())
                setHeaders(sheetHeaders)

                // Sugestão automática de mapeamento baseada em nomes comuns
                const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

                const newMapping = { ...mapping }
                sheetHeaders.forEach(h => {
                    const nh = normalize(h)
                    if (['nome', 'funcionario', 'candidato', 'promotor', 'colaborador'].includes(nh)) newMapping.nome = h
                    if (['loja', 'unidade', 'filial', 'ponto', 'centro custo', 'pdv'].includes(nh)) newMapping.loja = h
                    if (['cargo', 'funcao', 'ocupacao'].includes(nh)) newMapping.cargo = h
                    if (['data', 'admissao', 'inicio'].includes(nh)) newMapping.data_admissao = h
                })
                setMapping(newMapping)
                setStep(2)
            } else {
                setMessage({ type: 'error', text: 'Planilha parece estar vazia.' })
            }
        } catch (err) {
            console.error(err)
            setMessage({ type: 'error', text: 'Erro ao ler arquivo.' })
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async () => {
        if (!file) return
        setLoading(true)
        setMessage(null)

        const formData = new FormData()
        formData.append('bot_id', botId)
        formData.append('file', file)
        formData.append('mapping', JSON.stringify(mapping))

        try {
            const result = await uploadEmployees(formData)
            if ('error' in result) {
                setMessage({ type: 'error', text: result.error as string })
            } else {
                setMessage({ type: 'success', text: result.success as string })
                setStep(1)
                setFile(null)
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Erro na conexão com o servidor.' })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-4">
            {step === 1 ? (
                <div className="flex flex-col gap-4">
                    <div className="relative group border border-dashed border-gray-200 rounded-xl p-8 hover:border-gray-950 transition-colors bg-gray-50 text-center">
                        <input
                            type="file"
                            onChange={handleFileChange}
                            accept=".xlsx,.xls,.csv"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <FileSpreadsheet className="h-8 w-8 text-gray-400 mx-auto mb-3 group-hover:scale-110 transition-transform" />
                        <p className="text-xs font-bold text-gray-950 uppercase tracking-widest">Select Spreadsheet</p>
                        <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-widest">Excel or CSV</p>
                    </div>

                    <button
                        onClick={handleDeleteAll}
                        disabled={loading}
                        className="w-fit self-center px-4 py-2 text-[9px] font-bold text-gray-400 hover:text-red-600 border border-gray-100 hover:border-red-100 hover:bg-red-50 rounded-lg transition-all flex items-center gap-2 group bg-white uppercase tracking-widest"
                    >
                        <Trash2 className="h-3 w-3" />
                        Clear Database
                    </button>
                </div>
            ) : (
                <div className="bg-gray-50 rounded-xl p-6 border border-gray-100 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-2 mb-4 text-gray-950">
                        <MapIcon className="h-3.w-3.5" />
                        <h3 className="text-[10px] font-bold uppercase tracking-widest">Map Columns</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        {(Object.keys(mapping) as Array<keyof Mapping>).map((field) => (
                            <div key={field} className="space-y-1">
                                <label className="text-[9px] font-bold text-gray-400 uppercase ml-1 tracking-widest">
                                    {field === 'data_admissao' ? 'Admission Date' : field}
                                </label>
                                <select
                                    value={mapping[field]}
                                    onChange={(e) => setMapping({ ...mapping, [field]: e.target.value })}
                                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-[10px] font-bold text-gray-950 focus:border-gray-950 outline-none shadow-sm uppercase tracking-wider"
                                >
                                    <option value="">-- SELECT COLUMN --</option>
                                    {headers.map(h => (
                                        <option key={h} value={h}>{h}</option>
                                    ))}
                                </select>
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={handleSubmit}
                            disabled={loading || !mapping.nome}
                            className="flex-1 bg-gray-950 text-white font-bold py-3 rounded-lg hover:bg-gray-800 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.2em]"
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                            Confirm Import
                        </button>
                        <button
                            onClick={() => setStep(1)}
                            className="px-5 py-3 border border-gray-200 bg-white text-gray-400 text-[10px] font-bold rounded-lg hover:text-gray-950 transition-all active:scale-95 uppercase tracking-widest"
                        >
                            Cancel
                        </button>
                    </div>
                    {!mapping.nome && (
                        <p className="text-[9px] text-gray-400 font-bold mt-3 uppercase tracking-widest">* Name field is required.</p>
                    )}
                </div>
            )}

            {message && (
                <div className={`p-4 rounded-xl flex items-center gap-3 animate-in zoom-in duration-300 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'
                    }`}>
                    {message.type === 'success' ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                    <p className="text-sm font-bold">{message.text}</p>
                </div>
            )}
        </div>
    )
}
