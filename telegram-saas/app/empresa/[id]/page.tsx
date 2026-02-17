import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import CompanyImageUpload from "./CompanyImageUpload";
import { uploadCompanyLogo, uploadCompanyCarimbo, uploadCompanyCarimboFuncionario, clearCompanyAsset } from "./upload-actions";
import { ChevronLeft, Building2, Users, Image as ImageIcon, Briefcase, Calendar, Save, FileText } from "lucide-react";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export default async function CompanyPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: empresaId } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return redirect("/login");
    }

    const { data: empresa, error } = await supabase
        .from("empresas")
        .select("*")
        .eq("id", empresaId)
        .single();

    if (error || !empresa) {
        return (
            <div className="flex h-screen items-center justify-center">
                <p className="text-red-500">Empresa não encontrada.</p>
                <Link href="/" className="ml-4 text-blue-500 underline">Voltar</Link>
            </div>
        );
    }

    // Ação para salvar o nome da empresa
    async function updateCompany(formData: FormData) {
        'use server'
        const supabase = await createClient()
        const newName = formData.get('nome') as string
        await supabase.from('empresas').update({ nome: newName }).eq('id', empresaId)
        revalidatePath(`/empresa/${empresaId}`)
    }

    return (
        <div className="min-h-screen bg-gray-50/50 p-8 text-black">
            <div className="mx-auto max-w-5xl">
                <Link href="/" className="flex items-center gap-1 text-sm font-bold text-gray-500 hover:text-blue-600 transition-colors mb-6 group w-fit">
                    <ChevronLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                    Voltar ao Dashboard
                </Link>

                <div className="mb-10 bg-white p-6 rounded-3xl shadow-sm border border-gray-100 relative z-10">
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                        <div className="h-16 w-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200 shrink-0">
                            {empresa.logo_url ? (
                                <img src={empresa.logo_url} className="h-full w-full object-contain p-2" />
                            ) : (
                                <Building2 className="h-8 w-8" />
                            )}
                        </div>
                        <div className="flex-1 w-full">
                            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center w-full">
                                <form action={updateCompany} className="flex-1 w-full space-y-1">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Nome da Marca</label>
                                    <div className="flex gap-2">
                                        <input
                                            name="nome"
                                            defaultValue={empresa.nome}
                                            className="text-3xl font-bold tracking-tight bg-transparent border-b-2 border-dashed border-gray-200 focus:border-blue-500 outline-none flex-1 py-1 text-gray-900 placeholder-gray-300 transition-colors"
                                            placeholder="Nome da Empresa"
                                        />
                                        <button className="shrink-0 bg-gray-100 text-gray-400 p-2 rounded-xl border border-gray-200 hover:bg-gray-950 hover:text-white transition-all shadow-sm active:scale-95" title="Salvar Nome">
                                            <Save className="h-5 w-5" />
                                        </button>
                                    </div>
                                </form>

                                <div className="shrink-0 flex flex-col items-end gap-2">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mr-1 text-right">Status de Ativação</label>
                                    <div className="flex flex-col gap-1 items-end">
                                        {/* Detalhes do Status */}
                                        <div className="flex gap-3 text-[10px] font-bold mb-2 items-center">
                                            <div className="flex items-center gap-1">
                                                <div className={`h-4 w-4 rounded-full border ${empresa.logo_url ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'} flex items-center justify-center overflow-hidden`}>
                                                    {empresa.logo_url ? <img src={empresa.logo_url} className="h-full w-full object-contain" /> : <span className="text-[8px] text-gray-300">✖</span>}
                                                </div>
                                                <span className={empresa.logo_url ? "text-green-600" : "text-gray-400"}>LOGO</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <div className={`h-4 w-4 rounded-full border ${empresa.carimbo_url ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'} flex items-center justify-center overflow-hidden`}>
                                                    {empresa.carimbo_url ? <img src={empresa.carimbo_url} className="h-full w-full object-contain" /> : <span className="text-[8px] text-gray-300">✖</span>}
                                                </div>
                                                <span className={empresa.carimbo_url ? "text-green-600" : "text-gray-400"}>CNPJ</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <div className={`h-4 w-4 rounded-full border ${empresa.carimbo_funcionario_url ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'} flex items-center justify-center overflow-hidden`}>
                                                    {empresa.carimbo_funcionario_url ? <img src={empresa.carimbo_funcionario_url} className="h-full w-full object-contain" /> : <span className="text-[8px] text-gray-300">✖</span>}
                                                </div>
                                                <span className={empresa.carimbo_funcionario_url ? "text-green-600" : "text-gray-400"}>ASSIN</span>
                                            </div>
                                        </div>

                                        {empresa.logo_url && empresa.carimbo_url && empresa.carimbo_funcionario_url ? (
                                            <div className="flex items-center gap-2 bg-green-50 text-green-600 px-4 py-2 rounded-2xl border border-green-100 shadow-sm animate-in fade-in zoom-in duration-500">
                                                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                                                <span className="text-xs font-black uppercase tracking-wider">PRONTA PARA USO</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 bg-orange-50 text-orange-600 px-4 py-2 rounded-2xl border border-orange-100 shadow-sm">
                                                <div className="h-2 w-2 rounded-full bg-orange-400"></div>
                                                <span className="text-xs font-black uppercase tracking-wider">PENDENTE</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid gap-8">

                    {/* Seção Gestão de Templates */}
                    <section className="space-y-6">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                            <div className="flex items-center gap-2">
                                <FileText className="h-5 w-5 text-orange-500" />
                                <h2 className="text-xl font-bold">Conteúdo das Cartas</h2>
                            </div>
                            <Link
                                href={`/empresa/${empresa.id}/templates`}
                                className="text-xs font-bold text-blue-600 hover:text-blue-700 uppercase tracking-widest bg-blue-50 px-4 py-2 rounded-xl border border-blue-100 transition-all hover:bg-blue-100 active:scale-95"
                            >
                                Gerenciar Modelos
                            </Link>
                        </div>

                        <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center shrink-0">
                                    <FileText className="h-6 w-6" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-gray-900">Personalização de Textos</h3>
                                    <p className="text-sm text-gray-500 font-medium">Crie e edite os modelos de cartas que o bot enviará para esta marca.</p>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Seção Identidade Visual */}
                    <section className="space-y-6">
                        <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                            <ImageIcon className="h-5 w-5 text-blue-600" />
                            <h2 className="text-xl font-bold">Identidade Visual</h2>
                        </div>

                        <div className="grid gap-6 md:grid-cols-1">
                            {/* Logo */}
                            <CompanyImageUpload
                                empresaId={empresa.id}
                                currentUrl={empresa.logo_url}
                                label="Logotipo da Marca"
                                description="Este logo aparecerá no topo de todas as cartas geradas para esta empresa. Use preferencialmente PNG com fundo transparente."
                                action={uploadCompanyLogo}
                                onClear={clearCompanyAsset}
                                fieldName="logo"
                                buttonColor="bg-blue-600"
                            />

                            <div className="grid gap-6 md:grid-cols-2">
                                {/* Carimbo 1 */}
                                <CompanyImageUpload
                                    empresaId={empresa.id}
                                    currentUrl={empresa.carimbo_url}
                                    label="Carimbo / CNPJ"
                                    description="Carimbo oficial da empresa com CNPJ e razão social."
                                    action={uploadCompanyCarimbo}
                                    onClear={clearCompanyAsset}
                                    fieldName="carimbo"
                                    buttonColor="bg-emerald-600"
                                />

                                {/* Carimbo 2 */}
                                <CompanyImageUpload
                                    empresaId={empresa.id}
                                    currentUrl={empresa.carimbo_funcionario_url}
                                    label="Assinatura Digital"
                                    description="Assinatura do responsável que aparecerá abaixo do texto."
                                    action={uploadCompanyCarimboFuncionario}
                                    onClear={clearCompanyAsset}
                                    fieldName="carimbo_funcionario"
                                    buttonColor="bg-indigo-600"
                                />
                            </div>
                        </div>
                    </section>

                    {/* Seção Banco de Funcionários */}
                    <section className="space-y-6">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                            <div className="flex items-center gap-2">
                                <Users className="h-5 w-5 text-orange-500" />
                                <h2 className="text-xl font-bold">Base de Funcionários</h2>
                            </div>
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider bg-gray-100 px-3 py-1 rounded-full">
                                Vinculados a {empresa.nome}
                            </span>
                        </div>

                        <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
                            <p className="text-sm text-gray-500 mb-6 font-medium leading-relaxed">
                                Abaixo estão os funcionários que foram importados especificamente para esta marca.
                                O bot usará esta lista quando <strong>{empresa.nome}</strong> for selecionada.
                            </p>

                            <EmployeeList empresaId={empresa.id} />
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}

async function EmployeeList({ empresaId }: { empresaId: string }) {
    const supabase = await createClient();

    const { data: funcionarios, count } = await supabase
        .from('funcionarios')
        .select('*', { count: 'exact' })
        .eq('empresa_id', empresaId)
        .order('criado_em', { ascending: false })
        .limit(20);

    if (!funcionarios || funcionarios.length === 0) {
        return (
            <div className="text-center py-12 border-2 border-dashed border-gray-100 rounded-2xl bg-gray-50/50">
                <Users className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-400 font-bold">Nenhum funcionário encontrado.</p>
                <p className="text-xs text-gray-400 mt-1">Use a página do Bot para importar planilhas.</p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center px-2">
                <span className="text-xs font-bold text-gray-400 uppercase">{count} Registros</span>
            </div>
            <div className="overflow-hidden rounded-2xl border border-gray-100 shadow-sm">
                <table className="min-w-full divide-y divide-gray-100">
                    <thead className="bg-gray-50/80">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Nome</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Cargo</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Loja</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Admissão</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 bg-white">
                        {funcionarios.map((f) => (
                            <tr key={f.id} className="hover:bg-blue-50/50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-bold text-gray-900">{f.nome}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center gap-2">
                                        <Briefcase className="h-3 w-3 text-gray-400" />
                                        <span className="text-sm text-gray-600">{f.cargo || '-'}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center gap-2">
                                        <Building2 className="h-3 w-3 text-gray-400" />
                                        <span className="text-sm text-gray-600">{f.loja || '-'}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-3 w-3 text-gray-400" />
                                        <span className="text-sm text-gray-600">
                                            {f.data_admissao ? new Date(f.data_admissao).toLocaleDateString('pt-BR') : '-'}
                                        </span>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
