import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { createBot } from "./actions";
import TemplateList from "./TemplateList";
import CompanyList from "./CompanyList";
import RecentLetters from "./RecentLetters";
import { FileText, Bot, Plus, History, Settings2, ExternalLink, Building2, LogOut } from "lucide-react";

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
        <div className="min-h-screen p-6 md:p-12">
            <div className="mx-auto max-w-7xl">
                {/* HEADER */}
                <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className="bg-blue-600 text-white text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-tighter">SaaS Panel</span>
                            <h1 className="text-5xl font-black tracking-tighter text-gray-950">CONTROLE</h1>
                        </div>
                        <p className="text-gray-400 font-bold uppercase tracking-[0.2em] text-xs">Gestão centralizada de bots e modelos</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                        <a href="/gerar-carta" className="group flex items-center gap-3 bg-blue-600 hover:bg-blue-700 text-white px-6 py-4 rounded-2xl font-black shadow-xl shadow-blue-200 transition-all hover:scale-[1.03] active:scale-95">
                            <Plus className="h-5 w-5 stroke-[3]" />
                            GERAR CARTA MANUAL
                        </a>
                        <div className="flex items-center gap-4 bg-white px-6 py-3.5 rounded-2xl border border-gray-100 shadow-sm">
                            <div className="text-right">
                                <p className="text-xs font-black text-gray-900 leading-none mb-1">{user.email}</p>
                                <p className="text-[9px] text-blue-600 font-black uppercase tracking-widest leading-none">MASTER ADMIN</p>
                            </div>
                            <form action="/auth/signout" method="post">
                                <button className="p-2 text-gray-400 hover:text-red-600 transition-colors">
                                    <LogOut className="h-5 w-5" />
                                </button>
                            </form>
                        </div>
                    </div>
                </div>

                {/* STATS */}
                <div className="grid gap-6 md:grid-cols-3 mb-12">
                    {[
                        { label: 'Empresas', val: companiesCount, icon: Building2, color: 'text-blue-600', bg: 'bg-blue-50' },
                        { label: 'Bots Ativos', val: botsCount, icon: Bot, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                        { label: 'Cartas Geradas', val: totalLetters, icon: FileText, color: 'text-purple-600', bg: 'bg-purple-50' }
                    ].map((s, i) => (
                        <div key={i} className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm flex items-center gap-6 group hover:border-blue-200 transition-all hover:shadow-xl hover:shadow-blue-500/5">
                            <div className={`h-16 w-16 ${s.bg} ${s.color} rounded-2xl flex items-center justify-center transition-all group-hover:scale-110`}>
                                <s.icon className="h-8 w-8 stroke-[2.5]" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] mb-1">{s.label}</p>
                                <h3 className="text-3xl font-black text-gray-950 tabular-nums leading-none">{s.val || 0}</h3>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="grid gap-10 lg:grid-cols-3">
                    {/* BOTS SECTION */}
                    <div className="lg:col-span-2 space-y-10">
                        <section>
                            <div className="mb-6 flex items-center justify-between">
                                <h2 className="text-xl font-black flex items-center gap-3 text-gray-950 uppercase tracking-tight">
                                    <div className="h-2 w-2 rounded-full bg-blue-600 animate-pulse"></div>
                                    Monitoramento de Bots
                                </h2>
                            </div>

                            <div className="grid gap-5 md:grid-cols-2">
                                {bots?.map((bot) => (
                                    <div key={bot.id} className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-xl hover:shadow-blue-500/5 transition-all group border-b-4 border-b-gray-200 hover:border-b-blue-600">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="h-12 w-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-900 group-hover:bg-blue-600 group-hover:text-white transition-all">
                                                <Bot className="h-6 w-6 stroke-[2]" />
                                            </div>
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${bot.ativo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {bot.ativo ? 'Online' : 'Offline'}
                                            </span>
                                        </div>
                                        <h3 className="text-xl font-black text-gray-950 mb-1">{bot.nome}</h3>
                                        <p className="text-[10px] text-gray-400 font-bold font-mono tracking-tight uppercase px-3 py-1 bg-gray-50 rounded-lg inline-block">ID: {bot.id.slice(0, 8)}...</p>

                                        <div className="mt-6 flex gap-2">
                                            <a href={`/bot/${bot.id}`} className="flex-1 rounded-2xl bg-gray-950 py-3 text-center text-xs font-black text-white hover:bg-blue-600 transition-all flex items-center justify-center gap-2 uppercase tracking-widest">
                                                <Settings2 className="h-4 w-4" />
                                                Configurar
                                            </a>
                                        </div>
                                    </div>
                                ))}

                                <div className="rounded-3xl border-2 border-dashed border-gray-200 bg-gray-50/50 p-6 flex flex-col items-center justify-center text-center group hover:border-blue-600 hover:bg-white transition-all">
                                    <div className="mb-4 text-gray-300 group-hover:text-blue-600 transition-colors">
                                        <Plus className="h-10 w-10 stroke-[1.5]" />
                                    </div>
                                    <h3 className="font-black text-gray-950 uppercase tracking-tighter text-sm mb-4">Novo Bot</h3>
                                    <form action={async (fd) => { 'use server'; await createBot(fd); }} className="w-full space-y-3">
                                        <input name="nome" placeholder="NOME DO BOT" className="w-full rounded-2xl border-2 border-gray-100 p-3 text-xs font-bold uppercase tracking-widest bg-white focus:border-blue-600 outline-none transition-all placeholder:text-gray-300" required />
                                        <input name="token" placeholder="TOKEN DO TELEGRAM" className="w-full rounded-2xl border-2 border-gray-100 p-3 text-xs font-bold font-mono bg-white focus:border-blue-600 outline-none transition-all placeholder:text-gray-300" required />
                                        <button className="w-full rounded-2xl bg-white border-2 border-gray-900 py-3 text-xs font-black text-gray-950 hover:bg-gray-900 hover:text-white transition-all shadow-sm">
                                            ADICIONAR
                                        </button>
                                    </form>
                                </div>
                            </div>
                        </section>

                        <section className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
                            <h2 className="text-xl font-black flex items-center gap-3 text-gray-950 uppercase tracking-tight mb-6">
                                <History className="h-6 w-6 text-purple-600" />
                                Histórico de Atividade
                            </h2>
                            <RecentLetters initialLetters={cartas || []} />
                        </section>
                    </div>

                    {/* MODELS SECTION */}
                    <div className="space-y-10">
                        <section className="bg-gray-950 text-white p-8 rounded-[32px] shadow-2xl shadow-blue-500/10">
                            <h2 className="text-xl font-black flex items-center gap-3 uppercase tracking-tight mb-2">
                                <FileText className="h-6 w-6 text-blue-500" />
                                Modelos
                            </h2>
                            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-8">Templates de cartas inteligentes</p>
                            <TemplateList initialTemplates={templates || []} companies={companies || []} />
                        </section>

                        <section className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
                            <h2 className="text-xl font-black flex items-center gap-3 text-gray-950 uppercase tracking-tight mb-2">
                                <Building2 className="h-6 w-6 text-blue-600" />
                                Marcas
                            </h2>
                            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-8">Gestão de logos e carimbos</p>
                            <CompanyList initialCompanies={companies || []} />
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
}
