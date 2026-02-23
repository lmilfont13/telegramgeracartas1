import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { updateBot, updateToken } from "./actions";
import ImageUpload from "./ImageUpload";
import TemplateEditor from "./TemplateEditor";
import StoreManagement from "../../empresa/[id]/StoreManagement";
import EmployeeUploadInteractive from "./EmployeeUploadInteractive";
import { uploadLogo, uploadCarimbo, uploadCarimboFuncionario } from "./upload-images";
import { ChevronLeft, Bot, Settings, Save, ImageIcon, Users } from "lucide-react";

export default async function BotPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: botIdFromParams } = await params;
    const supabase = await createClient();

    // Buscar dados reais do bot
    const { data: bot, error } = await supabase
        .from("bots")
        .select("*")
        .eq("id", botIdFromParams)
        .single();

    if (error || !bot) {
        return (
            <div className="flex h-screen items-center justify-center">
                <p className="text-red-500">Bot não encontrado ou acesso negado.</p>
                <Link href="/" className="ml-4 text-blue-500 underline">Voltar</Link>
            </div>
        );
    }

    // Buscar dados da empresa (logo e carimbos)
    const { data: empresa } = bot.empresa_id
        ? await supabase.from('empresas').select('lojas, logo_url, carimbo_url, carimbo_funcionario_url').eq('id', bot.empresa_id).maybeSingle()
        : { data: null };

    // Buscar template
    const { data: template } = bot.empresa_id
        ? await supabase.from('templates').select('*').eq('empresa_id', bot.empresa_id).maybeSingle()
        : { data: null };
    const templateTexto = template ? template.conteudo : "Olá {{NOME}}, seu pedido na {{LOJA}} foi processado em {{DATA}}.";

    // Buscar chaves disponíveis (placeholders) do último funcionário importado
    const { data: ultimoFuncionario } = bot.empresa_id
        ? await supabase
            .from('funcionarios')
            .select('dados_extras')
            .eq('empresa_id', bot.empresa_id)
            .order('criado_em', { ascending: false })
            .limit(1)
            .maybeSingle()
        : { data: null };

    const availablePlaceholders = ultimoFuncionario?.dados_extras
        ? Object.keys(ultimoFuncionario.dados_extras).filter(k =>
            !['nome', 'loja', 'cargo', 'rg', 'cpf', 'data', 'cdc', 'data_admissao', 'agencia', 'serie', 'carteira', 'numero_carteira_trabalho'].includes(k.toLowerCase())
        )
        : [];

    // Ação específica para o TemplateEditor (passada como prop)
    async function handleSaveTemplate(fd: FormData) {
        'use server'
        return await updateBot(fd)
    }

    return (
        <div className="min-h-screen bg-gray-50 p-8 text-black">
            <div className="mx-auto max-w-3xl">
                <Link href="/" className="flex items-center gap-1 text-[10px] font-bold text-gray-400 hover:text-gray-950 transition-colors mb-6 group w-fit uppercase tracking-widest">
                    <ChevronLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
                    Dashboard
                </Link>

                <div className="mb-10 bg-white p-6 rounded-xl border border-gray-200 relative z-10 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-10 bg-gray-50 rounded-lg flex items-center justify-center text-gray-950 border border-gray-100">
                            <Bot className="h-5 w-5" />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight uppercase">{bot.nome}</h1>
                    </div>
                    {bot.ativo ? (
                        <div className="flex items-center gap-2 bg-gray-950 text-white px-4 py-1.5 rounded-lg border border-transparent animate-in fade-in zoom-in duration-500">
                            <div className="h-1.5 w-1.5 rounded-full bg-white animate-pulse"></div>
                            <span className="text-[9px] font-bold uppercase tracking-widest">ACTIVE</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 bg-gray-50 text-gray-400 px-4 py-1.5 rounded-lg border border-gray-200">
                            <div className="h-1.5 w-1.5 rounded-full bg-gray-300"></div>
                            <span className="text-[9px] font-bold uppercase tracking-widest">INACTIVE</span>
                        </div>
                    )}
                </div>

                <div className="grid gap-6">

                    {/* Settings Section */}
                    <section className="space-y-6">
                        <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                            <Settings className="h-4 w-4 text-gray-950" />
                            <h2 className="text-lg font-bold">Bot Settings</h2>
                        </div>

                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                            <form action={async (fd) => { await updateBot(fd); }} className="space-y-6">
                                <input type="hidden" name="id" value={bot.id} />
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Bot Name</label>
                                    <div className="flex gap-2">
                                        <input
                                            name="nome"
                                            defaultValue={bot.nome}
                                            className="flex-1 bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs font-bold text-gray-900 focus:border-gray-950 outline-none transition-all uppercase tracking-wider"
                                        />
                                        <button type="submit" className="bg-gray-950 text-white px-6 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-gray-800 transition-all active:scale-95 flex items-center gap-2">
                                            <Save className="h-3.5 w-3.5" />
                                            Save
                                        </button>
                                    </div>
                                </div>
                            </form>

                            <div className="mt-8 pt-8 border-t border-gray-100">
                                <form action={updateToken} className="space-y-1">
                                    <input type="hidden" name="id" value={bot.id} />
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Telegram API Token</label>
                                    <div className="flex gap-2">
                                        <input
                                            name="token"
                                            defaultValue={bot.token_telegram}
                                            className="flex-1 bg-gray-50 border border-gray-200 rounded-lg p-3 text-[10px] font-bold text-gray-500 focus:border-gray-950 outline-none transition-all tracking-widest"
                                        />
                                        <button type="submit" className="px-6 py-2 border border-gray-200 bg-white text-gray-950 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-gray-50 transition-all active:scale-95">
                                            Update Token
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </section>

                    {/* Visual Identity Section */}
                    <section className="space-y-6">
                        <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                            <ImageIcon className="h-4 w-4 text-gray-950" />
                            <h2 className="text-lg font-bold">Visual Identity</h2>
                        </div>
                        <div className="grid gap-6">
                            <ImageUpload
                                botId={bot.id}
                                currentUrl={empresa?.logo_url}
                                label="Brand Logo"
                                description="Image that will appear at the header of the letters. PNG recommended."
                                action={uploadLogo}
                                fieldName="logo"
                                buttonColor="bg-gray-950"
                            />

                            <div className="grid gap-6 md:grid-cols-2">
                                <ImageUpload
                                    botId={bot.id}
                                    currentUrl={empresa?.carimbo_url}
                                    label="Official Stamp / CNPJ"
                                    description="Company's official stamp with Tax ID and details."
                                    action={uploadCarimbo}
                                    fieldName="carimbo"
                                    buttonColor="bg-gray-800"
                                />

                                <ImageUpload
                                    botId={bot.id}
                                    currentUrl={empresa?.carimbo_funcionario_url}
                                    label="Digital Signature"
                                    description="Signature of the responsible person that will appear below the text."
                                    action={uploadCarimboFuncionario}
                                    fieldName="carimbo_funcionario"
                                    buttonColor="bg-gray-700"
                                />
                            </div>
                        </div>
                    </section>

                    {/* Gestão de Lojas */}
                    <StoreManagement empresaId={bot.empresa_id} initialLojas={empresa?.lojas || []} />

                    {/* Template da Carta */}
                    <TemplateEditor
                        botId={bot.id}
                        initialTemplate={templateTexto}
                        availablePlaceholders={availablePlaceholders}
                        action={handleSaveTemplate}
                    />

                    {/* Employees Database Section */}
                    <section className="space-y-6">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                            <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-gray-950" />
                                <h2 className="text-lg font-bold">Employee Database</h2>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                            <p className="text-xs text-gray-500 mb-6 font-medium leading-relaxed">
                                Import employees for this brand. You can map your spreadsheet columns manually.
                            </p>

                            <EmployeeUploadInteractive botId={bot.id} />

                            <div className="mt-10 pt-10 border-t border-gray-100">
                                <h3 className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <Users className="h-3 w-3" />
                                    Last Imported Records
                                </h3>
                                <EmployeeList botId={bot.id} />
                            </div>
                        </div>
                    </section>

                </div>
            </div>
        </div>
    );
}


async function EmployeeList({ botId }: { botId: string }) {
    const supabase = await createClient();

    // Buscar empresa do bot primeiro
    const { data: bot } = await supabase.from('bots').select('empresa_id').eq('id', botId).single();
    if (!bot) return null;

    const { data: funcionarios } = await supabase
        .from('funcionarios')
        .select('*')
        .eq('empresa_id', bot.empresa_id)
        .order('criado_em', { ascending: false })
        .limit(5);

    if (!funcionarios || funcionarios.length === 0) {
        return <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest bg-gray-50 p-6 rounded-xl border border-dashed border-gray-200 text-center">No records found</p>
    }

    return (
        <div className="overflow-hidden rounded-xl border border-gray-100">
            <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-4 py-3 text-left text-[9px] font-bold text-gray-400 uppercase tracking-widest">Name</th>
                        <th className="px-4 py-3 text-left text-[9px] font-bold text-gray-400 uppercase tracking-widest">Store</th>
                        <th className="px-4 py-3 text-left text-[9px] font-bold text-gray-400 uppercase tracking-widest">Role</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 bg-white">
                    {funcionarios.map((f) => (
                        <tr key={f.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 whitespace-nowrap">
                                <div className="text-sm font-bold text-gray-900">{f.nome}</div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{f.loja || '-'}</div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{f.cargo || '-'}</div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
