'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, FileText, Search, Download } from 'lucide-react'
import { toast } from 'sonner'

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

            // Mapeamento padrão
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
                // Se o placeholder estiver nos dados_extras
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

            // Processar o texto com os placeholders preenchidos
            let processedText = templateContent
            Object.entries(placeholders).forEach(([tag, value]) => {
                const pattern = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                // Adiciona negrito se houver valor (exceto datas)
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

            if (!response.ok) throw new Error('Falha ao gerar PDF')

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
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="container mx-auto py-10 px-4 max-w-4xl">
            <h1 className="text-3xl font-bold mb-8 flex items-center gap-2">
                <FileText className="w-8 h-8 text-blue-500" />
                Gerador de Carta Manual
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* CONFIGURAÇÃO */}
                <div className="space-y-6">
                    <Card className="border-slate-800 bg-slate-900/50 backdrop-blur">
                        <CardHeader>
                            <CardTitle className="text-lg">1. Seleção</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Empresa</Label>
                                <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                                    <SelectTrigger className="bg-slate-950 border-slate-800">
                                        <SelectValue placeholder="Escolha a empresa" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-950 border-slate-800">
                                        {companies.map(c => (
                                            <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Modelo (Template)</Label>
                                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                                    <SelectTrigger className="bg-slate-950 border-slate-800">
                                        <SelectValue placeholder="Escolha o modelo" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-950 border-slate-800">
                                        {templates.map(t => (
                                            <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2 pt-4">
                                <Label className="flex items-center gap-2">
                                    <Search className="w-4 h-4 text-slate-400" />
                                    Buscar Funcionário (Opcional)
                                </Label>
                                <Input
                                    placeholder="Nome ou CPF..."
                                    className="bg-slate-950 border-slate-800"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    disabled={!selectedCompany}
                                />
                                {employees.length > 0 && (
                                    <div className="mt-2 p-2 rounded-md bg-slate-950 border border-slate-800 max-h-40 overflow-y-auto">
                                        {employees.map(e => (
                                            <div
                                                key={e.id}
                                                className={`p-2 cursor-pointer hover:bg-slate-900 rounded ${selectedEmployee === e.id ? 'bg-blue-900/40' : ''}`}
                                                onClick={() => setSelectedEmployee(e.id)}
                                            >
                                                <div className="text-sm font-medium">{e.nome}</div>
                                                <div className="text-xs text-slate-500">{e.cpf}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Button
                        className="w-full h-12 text-lg bg-blue-600 hover:bg-blue-500"
                        disabled={loading || !selectedTemplate || !selectedCompany}
                        onClick={handleGenerate}
                    >
                        {loading ? <Loader2 className="mr-2 animate-spin" /> : <Download className="mr-2" />}
                        Gerar Carta em PDF
                    </Button>
                </div>

                {/* FORMULÁRIO DINÂMICO */}
                <Card className="border-slate-800 bg-slate-900/50 backdrop-blur">
                    <CardHeader>
                        <CardTitle className="text-lg">2. Preencher Dados</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                        {Object.keys(placeholders).length === 0 ? (
                            <div className="text-center py-10 text-slate-500">
                                Selecione um modelo para ver os campos
                            </div>
                        ) : (
                            Object.keys(placeholders).map(tag => (
                                <div key={tag} className="space-y-2">
                                    <Label className="text-xs text-slate-400">{tag}</Label>
                                    <Input
                                        value={placeholders[tag]}
                                        onChange={(e) => setPlaceholders({ ...placeholders, [tag]: e.target.value })}
                                        className="bg-slate-950 border-slate-800 h-9"
                                        placeholder={`Valor para ${tag}`}
                                    />
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
