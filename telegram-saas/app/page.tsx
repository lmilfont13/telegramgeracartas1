import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createBot } from "./actions";
import TemplateList from "./TemplateList";
import CompanyList from "./CompanyList";
import RecentLetters from "./RecentLetters";
import { FileText, Bot, Plus, History, Settings2, ExternalLink, Building2 } from "lucide-react";

export default async function Dashboard() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return redirect("/login");
    }

    // Buscar os bots
    const { data: bots, count: botsCount } = await supabase.from("bots").select("*", { count: 'exact' }).order('criado_em', { ascending: false });

    // Buscar as empresas (marcas)
    const { data: companies, count: companiesCount } = await supabase.from("empresas").select("id, nome, logo_url, criado_em", { count: 'exact' }).order('criado_em', { ascending: false });

    // Buscar os templates
    const { data: templates } = await supabase.from("templates").select("id, nome, conteudo, empresa_id, criado_em").order('criado_em', { ascending: false });

    // Buscar contagem de cartas geradas
    const { count: totalLetters } = await supabase.from("cartas_geradas").select("*", { count: 'exact', head: true });

    // Buscar as últimas cartas geradas
    const { data: cartas } = await supabase.from("cartas_geradas").select("*").order('criado_em', { ascending: false }).limit(6);

    return (
        <div className="min-h-screen bg-gray-50 p-8 text-black">
            <div className="mx-auto max-w-6xl">
                <div className="mb-10 flex items-center justify-between">
                    <div>
                        <h1 className="text-4xl font-black tracking-tight text-gray-950">Controle SaaS</h1>
                        <p className="text-gray-500 mt-1 font-medium">Gestão centralizada de marcas, bots e modelos.</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <a href="/gerar-carta" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-2xl font-bold shadow-lg shadow-blue-200 transition-all transform hover:scale-105">
                            <Plus className="h-5 w-5" />
                            Gerar Carta Manual
                        </a>
                        <div className="flex items-center gap-4 bg-white px-6 py-3 rounded-2xl border border-gray-100 shadow-sm">
                            <div className="text-right">
                                <p className="text-sm font-bold text-gray-900">{user.email}</p>
                                <p className="text-[10px] text-blue-600 font-black uppercase tracking-widest">Master Admin</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ESTATISTICAS RAPIDAS */}
                <div className="grid gap-6 md:grid-cols-3 mb-10">
                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-5 group hover:border-blue-200 transition-all">
                        <div className="h-12 w-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all">
                            <Building2 className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Empresas</p>
                            <h3 className="text-2xl font-black text-gray-950">{companiesCount || 0}</h3>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-5 group hover:border-blue-200 transition-all">
                        <div className="h-12 w-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all">
                            <Bot className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Bots Ativos</p>
                            <h3 className="text-2xl font-black text-gray-950">{botsCount || 0}</h3>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-5 group hover:border-purple-200 transition-all">
                        <div className="h-12 w-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-all">
                            <FileText className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Cartas Geradas</p>
                            <h3 className="text-2xl font-black text-gray-950">{totalLetters || 0}</h3>
                        </div>
                    </div>
                </div>

                <div className="grid gap-8 lg:grid-cols-3">

                    {/* COLUNA ESQUERDA: BOTS */}
                    <div className="lg:col-span-2 space-y-8">
                        <section>
                            <div className="mb-4 flex items-center justify-between">
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    <Bot className="h-6 w-6 text-blue-600" />
                                    Meus Bots
                                </h2>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                {bots?.map((bot) => (
                                    <div key={bot.id} className="rounded-xl border bg-white p-5 shadow-sm hover:shadow-md transition-all group">
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                                                <Bot className="h-6 w-6" />
                                            </div>
                                            <div className={`h-2.5 w-2.5 rounded-full ${bot.ativo ? 'bg-green-500' : 'bg-red-500'} shadow-sm`}></div>
                                        </div>
                                        <h3 className="text-lg font-bold">{bot.nome}</h3>
                                        <p className="text-xs text-gray-400 font-mono mt-1">TOKEN: {bot.token_telegram.slice(0, 12)}...</p>

                                        <div className="mt-5 flex gap-2">
                                            <a href={`/bot/${bot.id}`} className="flex-1 rounded-lg bg-gray-900 py-2 text-center text-sm font-semibold text-white hover:bg-black transition-colors flex items-center justify-center gap-2">
                                                <Settings2 className="h-4 w-4" />
                                                Configurar
                                            </a>
                                        </div>
                                    </div>
                                ))}

                                <div className="rounded-xl border border-dashed border-gray-300 bg-white p-5 flex flex-col items-center justify-center text-center">
                                    <h3 className="font-bold text-gray-900">Novo Bot</h3>
                                    <form action={async (fd) => { 'use server'; await createBot(fd); }} className="mt-4 w-full space-y-3">
                                        <input name="nome" placeholder="Nome (Ex: Unidade Sul)" className="w-full rounded-lg border p-2 text-sm bg-gray-50 focus:bg-white transition-all outline-none focus:ring-2 focus:ring-blue-100" required />
                                        <input name="token" placeholder="Token do BotFather" className="w-full rounded-lg border p-2 text-sm bg-gray-50 focus:bg-white transition-all outline-none focus:ring-2 focus:ring-blue-100" required />
                                        <button className="w-full rounded-lg bg-blue-600 py-2 text-sm font-bold text-white hover:bg-blue-700 flex items-center justify-center gap-2">
                                            <Plus className="h-4 w-4" />
                                            Adicionar Bot
                                        </button>
                                    </form>
                                </div>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
                                <History className="h-6 w-6 text-purple-600" />
                                Últimas Cartas Geradas
                            </h2>
                            <RecentLetters initialLetters={cartas || []} />
                        </section>
                    </div>

                    {/* COLUNA DIREITA: MODELOS E EMPRESAS */}
                    <div className="space-y-8">
                        <section>
                            <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
                                <FileText className="h-6 w-6 text-orange-500" />
                                Modelos de Cartas
                            </h2>
                            <TemplateList initialTemplates={templates || []} companies={companies || []} />
                        </section>

                        <section>
                            <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
                                <Building2 className="h-6 w-6 text-blue-600" />
                                Gerenciar Empresas (Marcas)
                            </h2>
                            <CompanyList initialCompanies={companies || []} />
                        </section>
                    </div>

                </div>
            </div>
        </div>
    );
}
