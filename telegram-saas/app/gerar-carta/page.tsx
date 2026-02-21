'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, FileText, Search, Download, ArrowLeft, Building2, UserCircle, LayoutTemplate } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

export default function GerarCartaPage() {
    const supabase = createClient()
    const [loading, setLoading] = useState(false)
    const [companies, setCompanies] = useState<any[]>([])
    const [templates, setTemplates] = useState<any[]>([])
    const [employees, setEmployees] = useState<any[]>([])

    const [selectedCompany, setSelectedCompany] = useState<string>('')
    const [selectedTemplate, setSelectedTemplate] = useState<string>('')
    const [selectedEmployee, setSelectedEmployee] = useState<string>('')
    const [searchTerm, setSearchTerm] = useState('')

    const [placeholders, setPlaceholders] = useState<Record<string, string>>({})
    const [templateContent, setTemplateContent] = useState('')

    // Carregar dados iniciais
    useEffect(() => {
        async function loadData() {
            const { data: companiesData } = await supabase.from('empresas').select('*').order('nome')
            const { data: templatesData } = await supabase.from('templates').select('*').order('nome')
            setCompanies(companiesData || [])
            setTemplates(templatesData || [])
        }
        loadData()
    }, [])

    // Buscar funcionários quando a empresa for selecionada ou o termo de busca mudar
    useEffect(() => {
        if (!selectedCompany) {
            setEmployees([])
            return
        }

        const delayDebounce = setTimeout(async () => {
            let query = supabase.from('funcionarios')
                .select('*')
                .eq('empresa_id', selectedCompany)
                .order('nome')
                .limit(10)

            if (searchTerm) {
                query = query.or(`nome.ilike.%${searchTerm}%,cpf.ilike.%${searchTerm}%`)
            }

            const { data } = await query
            setEmployees(data || [])
        }, 300)

        return () => clearTimeout(delayDebounce)
    }, [selectedCompany, searchTerm])

    // Detectar placeholders quando o template mudar
    useEffect(() => {
        if (!selectedTemplate) return
        const template = templates.find(t => t.id === selectedTemplate)
        if (template) {
            setTemplateContent(template.conteudo)
            const matches = template.conteudo.match(/\{\{([^{}]+)\}\}/g) || []
            const uniqueTags = Array.from(new Set(matches.map((m: string) => m.toUpperCase())))

            const newPlaceholders: Record<string, string> = {}
            uniqueTags.forEach((tag: any) => {
                newPlaceholders[tag] = ''
            })
            setPlaceholders(newPlaceholders)
        }
    }, [selectedTemplate, templates])

    // Auto-preencher placeholders quando o funcionário for selecionado
    useEffect(() => {
        if (!selectedEmployee) return
        const emp = employees.find(e => e.id === selectedEmployee)
        if (emp) {
            const updated = { ...placeholders }

            const map: Record<string, any> = {
                '{{NOME}}': emp.nome,
                '{{CPF}}': emp.cpf,
                '{{RG}}': emp.rg,
                '{{CARGO}}': emp.cargo,
                '{{LOJA}}': emp.loja,
                '{{CDC}}': emp.cdc,
                '{{DATA_ADMISSAO}}': emp.data_admissao ? new Date(emp.data_admissao).toLocaleDateString('pt-BR') : '',
                '{{DATA_ATUAL}}': new Date().toLocaleDateString('pt-BR'),
                '{{DATA}}': new Date().toLocaleDateString('pt-BR')
            }

            Object.keys(updated).forEach(tag => {
                if (map[tag]) updated[tag] = map[tag]
                if (emp.dados_extras && emp.dados_extras[tag.replace(/[{}]/g, '').toLowerCase()]) {
                    updated[tag] = emp.dados_extras[tag.replace(/[{}]/g, '').toLowerCase()]
                }
            })
            setPlaceholders(updated)
        }
    }, [selectedEmployee])

    const handleGenerate = async () => {
        if (!selectedCompany || !selectedTemplate) {
            toast.error('Selecione uma empresa e um template')
            return
        }

        setLoading(true)
        try {
            const company = companies.find(c => c.id === selectedCompany)

            let processedText = templateContent
            Object.entries(placeholders).forEach(([tag, value]) => {
                const pattern = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const formatted = (value && !tag.includes('DATA')) ? `**${value}**` : (value || '')
                processedText = processedText.replace(new RegExp(pattern, 'gi'), formatted)
            })

            const response = await fetch('/api/generate-pdf', {
                method: 'POST',
                body: JSON.stringify({
                    text: processedText,
                    logoUrl: company.logo_url,
                    carimbo1Url: company.carimbo_1_url,
                    carimbo2Url: company.carimbo_2_url,
                    stampPosition: 'ambos',
                    compact: false
                })
            })

            if (!response.ok) {
                const errData = await response.json().catch(() => ({ error: 'Falha ao gerar PDF' }));
                throw new Error(errData.error || 'Falha ao gerar PDF');
            }

            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `Carta_${placeholders['{{NOME}}'] || 'Manual'}.pdf`
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
            toast.success('PDF gerado com sucesso!')
        } catch (err: any) {
            toast.error(err.message)
            console.error(err);
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen p-6 md:p-12 bg-white text-gray-950 font-sans antialiased">
            <div className="mx-auto max-w-5xl">
                {/* BACK BUTTON AND HEADER */}
                <div className="mb-10">
                    <Link href="/" className="inline-flex items-center gap-2 text-xs font-black text-gray-400 hover:text-blue-600 uppercase tracking-widest mb-6 transition-colors group">
                        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                        Voltar ao Painel
                    </Link>

                    <div className="flex items-center gap-4">
                        <div className="h-16 w-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-200">
                            <FileText className="h-8 w-8 text-white stroke-[2.5]" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black tracking-tighter uppercase leading-none mb-1">Gerador Manual</h1>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">Criação instantânea de documentos em PDF</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    {/* LEFT COLUMN: CONFIG */}
                    <div className="lg:col-span-5 space-y-8">
                        <section className="space-y-6">
                            <div className="flex items-center gap-2 mb-4">
                                <span className="h-6 w-6 rounded-full bg-gray-950 text-white flex items-center justify-center text-[10px] font-black">1</span>
                                <h2 className="text-sm font-black uppercase tracking-widest text-gray-950">Seleção de Base</h2>
                            </div>

                            <Card className="border-2 border-gray-100 shadow-sm rounded-3xl overflow-hidden">
                                <CardContent className="p-8 space-y-6">
                                    <div className="space-y-3">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                                            <Building2 className="w-3.5 h-3.5" /> Empresa / Marca
                                        </Label>
                                        <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                                            <SelectTrigger className="h-12 rounded-xl border-2 border-gray-100 bg-gray-50 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all font-bold">
                                                <SelectValue placeholder="Selecione a Marca" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl border-2 border-gray-100 shadow-2xl">
                                                {companies.map(c => (
                                                    <SelectItem key={c.id} value={c.id} className="font-bold py-2.5">{c.nome}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-3">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                                            <LayoutTemplate className="w-3.5 h-3.5" /> Modelo de Documento
                                        </Label>
                                        <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                                            <SelectTrigger className="h-12 rounded-xl border-2 border-gray-100 bg-gray-50 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all font-bold">
                                                <SelectValue placeholder="Escolha o Modelo" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl border-2 border-gray-100 shadow-2xl">
                                                {templates.map(t => (
                                                    <SelectItem key={t.id} value={t.id} className="font-bold py-2.5">{t.nome}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="pt-4 space-y-3">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                                            <Search className="w-3.5 h-3.5" /> Vincular Funcionário
                                        </Label>
                                        <div className="relative">
                                            <Input
                                                placeholder="BUSCAR POR NOME OU CPF..."
                                                className="h-12 rounded-xl border-2 border-gray-100 bg-gray-50 pl-11 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all font-bold uppercase text-[11px] tracking-wider"
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                disabled={!selectedCompany}
                                            />
                                            <Search className="absolute left-4 top-4 h-4 w-4 text-gray-300" />
                                        </div>

                                        {employees.length > 0 && (
                                            <div className="mt-2 rounded-2xl border-2 border-gray-100 bg-white shadow-xl shadow-gray-200/50 overflow-hidden divide-y divide-gray-50">
                                                {employees.map(e => (
                                                    <div
                                                        key={e.id}
                                                        className={`p-4 cursor-pointer hover:bg-blue-50 transition-colors flex items-center justify-between ${selectedEmployee === e.id ? 'bg-blue-600 text-white' : ''}`}
                                                        onClick={() => setSelectedEmployee(e.id)}
                                                    >
                                                        <div>
                                                            <div className="text-xs font-black uppercase tracking-tighter">{e.nome}</div>
                                                            <div className={`text-[10px] font-bold ${selectedEmployee === e.id ? 'text-blue-200' : 'text-gray-400'}`}>{e.cpf}</div>
                                                        </div>
                                                        <UserCircle className={`h-5 w-5 ${selectedEmployee === e.id ? 'text-white' : 'text-gray-100'}`} />
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </section>

                        <Button
                            className="w-full h-20 rounded-[32px] text-lg font-black uppercase tracking-[0.2em] bg-blue-600 shadow-2xl shadow-blue-500/20 hover:bg-blue-700 hover:scale-[1.02] active:scale-95 transition-all flex flex-col gap-0.5"
                            disabled={loading || !selectedTemplate || !selectedCompany}
                            onClick={handleGenerate}
                        >
                            <div className="flex items-center gap-4">
                                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Download className="h-6 w-6 stroke-[3]" />}
                                <span>GERAR PDF AGORA</span>
                            </div>
                        </Button>
                    </div>

                    {/* RIGHT COLUMN: PLACEHOLDERS */}
                    <div className="lg:col-span-7">
                        <section className="space-y-6">
                            <div className="flex items-center gap-2 mb-4">
                                <span className="h-6 w-6 rounded-full bg-gray-950 text-white flex items-center justify-center text-[10px] font-black">2</span>
                                <h2 className="text-sm font-black uppercase tracking-widest text-gray-950">Preenchimento de Campos</h2>
                            </div>

                            <Card className="border-2 border-gray-100 shadow-sm rounded-[40px] bg-white min-h-[500px]">
                                <CardContent className="p-10">
                                    {Object.keys(placeholders).length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-[400px] text-center border-4 border-dashed border-gray-50 rounded-[32px]">
                                            <LayoutTemplate className="w-16 h-16 text-gray-100 mb-6" />
                                            <p className="text-[10px] text-gray-300 font-black uppercase tracking-[0.3em] max-w-[200px]">
                                                AGUARDANDO SELEÇÃO DE MODELO
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {Object.keys(placeholders).map(tag => (
                                                <div key={tag} className="space-y-2 group">
                                                    <Label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-1 group-focus-within:text-blue-600 transition-colors">{tag}</Label>
                                                    <Input
                                                        value={placeholders[tag]}
                                                        onChange={(e) => setPlaceholders({ ...placeholders, [tag]: e.target.value })}
                                                        className="h-12 rounded-2xl border-2 border-gray-100 bg-gray-50 px-4 font-bold text-gray-950 focus:border-blue-600 focus:bg-white transition-all shadow-inner outline-none"
                                                        placeholder={`VALOR PARA ${tag}`}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    )
}
