import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import CompanyImageUpload from "./CompanyImageUpload";
import { uploadCompanyLogo, uploadCompanyCarimbo, uploadCompanyCarimboFuncionario, clearCompanyAsset } from "./upload-actions";
import StoreManagement from "./StoreManagement";
import { ChevronLeft, Building2, Users, Image as ImageIcon, Briefcase, Calendar, Save, FileText, Store } from "lucide-react";
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

    // Busca o primeiro bot desta empresa para usar no componente de upload
    const { data: bots } = await supabase.from("bots").select("id").eq("empresa_id", empresaId).limit(1);
    const firstBot = bots?.[0];

    // Ação para salvar o nome da empresa
    async function updateCompany(formData: FormData) {
        'use server'
        const supabase = await createClient()
        const newName = formData.get('nome') as string
        const newFooter = formData.get('rodape') as string
        await supabase.from('empresas').update({
            nome: newName,
            rodape: newFooter
        }).eq('id', empresaId)
        revalidatePath(`/empresa/${empresaId}`)
    }

    return (
        <div className="min-h-screen bg-gray-50/50 p-8 text-black">
            <div className="mx-auto max-w-5xl">
                <Link href="/" className="flex items-center gap-1 text-[10px] font-bold text-gray-400 hover:text-gray-950 transition-colors mb-6 group w-fit uppercase tracking-widest">
                    <ChevronLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
                    Dashboard
                </Link>

                <div className="mb-10 bg-white p-6 rounded-xl border border-gray-200 relative z-10">
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                        <div className="h-14 w-14 bg-gray-50 rounded-lg flex items-center justify-center text-gray-950 border border-gray-100 shrink-0">
                            {empresa.logo_url ? (
                                <img src={empresa.logo_url} className="h-full w-full object-contain p-2" />
                            ) : (
                                <Building2 className="h-6 w-6" />
                            )}
                        </div>
                        <div className="flex-1 w-full">
                            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center w-full">
                                <form action={updateCompany} className="flex-1 w-full space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Nome da Marca</label>
                                        <div className="flex gap-2">
                                            <input
                                                name="nome"
                                                defaultValue={empresa.nome}
                                                className="text-2xl font-bold tracking-tight bg-transparent border-b border-dashed border-gray-200 focus:border-gray-950 outline-none flex-1 py-1 text-gray-900 placeholder-gray-300 transition-colors uppercase"
                                                placeholder="Brand Name"
                                            />
                                            <button className="shrink-0 bg-gray-950 text-white p-2 rounded-lg hover:bg-gray-800 transition-all active:scale-95" title="Save Changes">
                                                <Save className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Footer Details (Address / Contacts)</label>
                                        <textarea
                                            name="rodape"
                                            defaultValue={empresa.rodape || ''}
                                            rows={2}
                                            className="w-full text-[10px] font-bold bg-gray-50 border border-gray-200 rounded-lg p-3 focus:border-gray-950 outline-none transition-all resize-none uppercase tracking-wider"
                                            placeholder="Ex: Street Example, 123 - City - State - Fone: (11) 0000-0000"
                                        />
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
                                            <div className="flex items-center gap-2 bg-gray-950 text-white px-4 py-1.5 rounded-lg border border-transparent animate-in fade-in zoom-in duration-500">
                                                <div className="h-1.5 w-1.5 rounded-full bg-white animate-pulse"></div>
                                                <span className="text-[9px] font-bold uppercase tracking-widest">READY FOR USE</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 bg-gray-50 text-gray-400 px-4 py-1.5 rounded-lg border border-gray-200">
                                                <div className="h-1.5 w-1.5 rounded-full bg-gray-300"></div>
                                                <span className="text-[9px] font-bold uppercase tracking-widest">PENDING ASSETS</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid gap-8">

                    {/* Document Content Section */}
                    <section className="space-y-6">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                            <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-gray-950" />
                                <h2 className="text-lg font-bold">Document Content</h2>
                            </div>
                            <Link
                                href={`/empresa/${empresa.id}/templates`}
                                className="text-[9px] font-bold text-gray-950 hover:bg-gray-50 uppercase tracking-widest px-4 py-2 rounded-lg border border-gray-200 transition-all active:scale-[0.98]"
                            >
                                Manage Models
                            </Link>
                        </div>

                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                            <div className="flex items-center gap-4">
                                <div className="h-10 w-10 bg-gray-50 text-gray-950 rounded-lg flex items-center justify-center shrink-0 border border-gray-100">
                                    <FileText className="h-5 w-5" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-sm font-bold text-gray-900">Text Customization</h3>
                                    <p className="text-xs text-gray-500 font-medium tracking-tight">Create and edit the letter templates used by the bot for this brand.</p>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Store Management Section */}
                    <section className="space-y-6">
                        <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                            <Store className="h-4 w-4 text-gray-950" />
                            <h2 className="text-lg font-bold">Store Management</h2>
                        </div>
                        <StoreManagement empresaId={empresaId} initialLojas={empresa.lojas || []} />
                    </section>

                    {/* Visual Identity Section */}
                    <section className="space-y-6">
                        <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                            <ImageIcon className="h-4 w-4 text-gray-950" />
                            <h2 className="text-lg font-bold">Visual Identity</h2>
                        </div>

                        <div className="grid gap-6 md:grid-cols-1">
                            {/* Logo */}
                            <CompanyImageUpload
                                empresaId={empresa.id}
                                currentUrl={empresa.logo_url}
                                label="Brand Logo"
                                description="This logo will appear at the top of all generated letters. Use PNG with transparent background."
                                action={uploadCompanyLogo}
                                onClear={clearCompanyAsset}
                                fieldName="logo"
                                buttonColor="bg-gray-950"
                            />

                            <div className="grid gap-6 md:grid-cols-2">
                                {/* Stamp 1 */}
                                <CompanyImageUpload
                                    empresaId={empresa.id}
                                    currentUrl={empresa.carimbo_url}
                                    label="Official Stamp / CNPJ"
                                    description="Company's official stamp with Tax ID and details."
                                    action={uploadCompanyCarimbo}
                                    onClear={clearCompanyAsset}
                                    fieldName="carimbo"
                                    buttonColor="bg-gray-800"
                                />

                                {/* Stamp 2 */}
                                <CompanyImageUpload
                                    empresaId={empresa.id}
                                    currentUrl={empresa.carimbo_funcionario_url}
                                    label="Digital Signature"
                                    description="Signature of the responsible person that will appear below the text."
                                    action={uploadCompanyCarimboFuncionario}
                                    onClear={clearCompanyAsset}
                                    fieldName="carimbo_funcionario"
                                    buttonColor="bg-gray-700"
                                />
                            </div>
                        </div>
                    </section>

                    {/* Employees Database Section */}
                    <section className="space-y-6">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                            <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-gray-950" />
                                <h2 className="text-lg font-bold">Employee Database</h2>
                            </div>
                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 border border-gray-100 px-3 py-1 rounded-lg">
                                Linked to {empresa.nome}
                            </span>
                        </div>

                        <div className="bg-white rounded-xl border border-gray-200 p-6 leading-relaxed">
                            <p className="text-xs text-gray-500 mb-6 font-medium">
                                Employees imported specifically for this brand.
                                The bot will use this list when <strong className="text-gray-950">{empresa.nome}</strong> is selected.
                            </p>

                            <div className="mb-10 pb-10 border-b border-gray-100">
                                <h3 className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <FileSpreadsheet className="h-3 w-3" />
                                    Import Assistant
                                </h3>
                                <EmployeeUploadInteractive botId={firstBot?.id || ""} />
                            </div>

                            <EmployeeList empresaId={empresa.id} />
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}

// Subcomponent to import EmployeeUploadInteractive
import EmployeeUploadInteractive from "../../bot/[id]/EmployeeUploadInteractive";
import { FileSpreadsheet } from "lucide-react";

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
            <div className="overflow-hidden rounded-xl border border-gray-100">
                <table className="min-w-full divide-y divide-gray-100">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-4 text-left text-[9px] font-bold text-gray-400 uppercase tracking-widest">Name</th>
                            <th className="px-6 py-4 text-left text-[9px] font-bold text-gray-400 uppercase tracking-widest">Role</th>
                            <th className="px-6 py-4 text-left text-[9px] font-bold text-gray-400 uppercase tracking-widest">Store</th>
                            <th className="px-6 py-4 text-left text-[9px] font-bold text-gray-400 uppercase tracking-widest">Joined</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 bg-white">
                        {funcionarios.map((f) => (
                            <tr key={f.id} className="hover:bg-gray-50 transition-colors">
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
