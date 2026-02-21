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
        <div className="min-h-screen bg-[#F8FAFC]">
            {/* SIDEBAR NAVIGATION */}
            <aside className="fixed left-0 top-0 hidden h-screen w-72 border-r border-gray-200 bg-white lg:block">
                <div className="flex h-full flex-col p-8">
                    <div className="mb-12 flex items-center gap-3">
                        <div className="h-10 w-10 bg-blue-600 rounded-xl flex items-center justify-center text-white">
                            <Bot className="h-6 w-6 stroke-[2.5]" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black tracking-tight text-gray-950 leading-none">TELEGRAM</h1>
                            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-1">SaaS MANAGER</p>
                        </div>
                    </div>

                    <nav className="flex-1 space-y-2">
                        {[
                            { name: 'Dashboard', icon: Bot, href: '#', active: true },
                            { name: 'Marcas', icon: Building2, href: '#marcas' },
                            { name: 'Modelos', icon: FileText, href: '#modelos' },
                            { name: 'Histórico', icon: History, href: '#historico' },
                        ].map((item) => (
                            <a
                                key={item.name}
                                href={item.active ? '#' : item.href}
                                className={`flex items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-bold uppercase tracking-wider transition-all ${item.active
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                                    : 'text-gray-400 hover:bg-gray-50 hover:text-gray-900'
                                    }`}
                            >
                                <item.icon className="h-5 w-5" />
                                {item.name}
                            </a>
                        ))}
                    </nav>

                    <div className="mt-auto pt-8 border-t border-gray-100">
                        <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                            <div className="flex-1 overflow-hidden">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{user.email?.split('@')[0]}</p>
                                <p className="text-[9px] text-blue-600 font-black uppercase tracking-widest">ADMIN MASTER</p>
                            </div>
                            <form action="/auth/signout" method="post">
                                <button className="p-2 text-gray-400 hover:text-red-600 transition-colors">
                                    <LogOut className="h-4 w-4" />
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </aside>

            {/* MAIN CONTENT */}
            <main className="lg:pl-72">
                <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-gray-100 bg-white/80 backdrop-blur-md px-8">
                    <h2 className="text-sm font-black text-gray-400 uppercase tracking-[0.2em]">Painel de Controle</h2>
                    <div className="flex items-center gap-4">
                        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest text-xs">Sistemas Online</span>
                    </div>
                </header>

                <div className="p-8">
                    {/* STATS HERO */}
                    <div className="mb-12 grid gap-6 md:grid-cols-3">
                        {[
                            { label: 'Marcas Ativas', val: companiesCount, icon: Building2, color: 'text-blue-600', bg: 'bg-blue-50' },
                            { label: 'Instâncias Bot', val: botsCount, icon: Bot, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                            { label: 'Cartas Geradas', val: totalLetters, icon: FileText, color: 'text-purple-600', bg: 'bg-purple-50' }
                        ].map((s, i) => (
                            <div key={i} className="relative overflow-hidden bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm group hover:shadow-xl transition-all">
                                <div className={`mb-6 h-12 w-12 ${s.bg} ${s.color} rounded-2xl flex items-center justify-center`}>
                                    <s.icon className="h-6 w-6 stroke-[2.5]" />
                                </div>
                                <h3 className="text-4xl font-black text-gray-950 tabular-nums mb-1 tracking-tighter">{s.val || 0}</h3>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.1em]">{s.label}</p>
                                <div className="absolute top-0 right-0 p-4 opacity-5">
                                    <s.icon className="h-24 w-24" />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="grid gap-8 lg:grid-cols-12">
                        {/* BOTS COL */}
                        <div className="lg:col-span-8 space-y-8">
                            <section>
                                <header className="flex items-center justify-between mb-6">
                                    <h2 className="text-xl font-black text-gray-950 uppercase tracking-tight flex items-center gap-3">
                                        <Bot className="h-6 w-6 text-blue-600" />
                                        Meus Bots
                                    </h2>
                                </header>

                                <div className="grid gap-6 md:grid-cols-2">
                                    {bots?.map((bot) => (
                                        <div key={bot.id} className="group relative bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-2xl hover:shadow-blue-500/10 transition-all border-b-4 border-b-transparent hover:border-b-blue-600">
                                            <div className="mb-6 flex items-center justify-between">
                                                <div className="h-12 w-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                                                    <Bot className="h-6 w-6" />
                                                </div>
                                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${bot.ativo ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                                    {bot.ativo ? 'Conectado' : 'Desconectado'}
                                                </span>
                                            </div>
                                            <h3 className="text-lg font-black text-gray-950 mb-4">{bot.nome}</h3>
                                            <a href={`/bot/${bot.id}`} className="flex w-full items-center justify-center gap-3 rounded-2xl bg-gray-950 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white hover:bg-blue-600 transition-all shadow-lg active:scale-95">
                                                <Settings2 className="h-4 w-4" />
                                                Configurar Bot
                                            </a>
                                        </div>
                                    ))}

                                    <div className="flex flex-col items-center justify-center rounded-[32px] border-2 border-dashed border-gray-200 bg-gray-50/50 p-8 text-center hover:border-blue-600 hover:bg-white transition-all group">
                                        <Plus className="h-10 w-10 text-gray-300 group-hover:text-blue-600 mb-4 transition-colors" />
                                        <h3 className="text-sm font-black text-gray-950 uppercase tracking-tighter mb-4">Adicionar Novo Instância</h3>
                                        <form action={async (fd) => { 'use server'; await createBot(fd); }} className="w-full space-y-3">
                                            <input name="nome" placeholder="NOME DO BOT" className="w-full rounded-2xl border border-gray-200 bg-white p-4 text-[10px] font-black uppercase tracking-widest focus:border-blue-600 focus:ring-4 focus:ring-blue-50 outline-none transition-all" required />
                                            <input name="token" placeholder="TOKEN DO TELEGRAM" className="w-full rounded-2xl border border-gray-200 bg-white p-4 text-[10px] font-black uppercase tracking-widest font-mono focus:border-blue-600 focus:ring-4 focus:ring-blue-50 outline-none transition-all" required />
                                            <button className="w-full rounded-2xl bg-blue-600 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white hover:bg-blue-700 shadow-xl shadow-blue-500/20 transition-all active:scale-95">
                                                CRIAR BOT
                                            </button>
                                        </form>
                                    </div>
                                </div>
                            </section>

                            <section id="historico" className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
                                <header className="flex items-center gap-3 mb-8">
                                    <History className="h-6 w-6 text-purple-600" />
                                    <h2 className="text-xl font-black text-gray-950 uppercase tracking-tight">Atividade Recente</h2>
                                </header>
                                <RecentLetters initialLetters={cartas || []} />
                            </section>
                        </div>

                        {/* RIGHT COL (MODELS/COMPANIES) */}
                        <div className="lg:col-span-4 space-y-8">
                            <section id="marcas" className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
                                <header className="mb-8">
                                    <h2 className="text-xl font-black text-gray-950 uppercase tracking-tight flex items-center gap-3">
                                        <Building2 className="h-6 w-6 text-blue-600" />
                                        Marcas
                                    </h2>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Configurações visuais e carimbos</p>
                                </header>
                                <CompanyList initialCompanies={companies || []} />
                            </section>

                            <section id="modelos" className="bg-gray-950 text-white p-8 rounded-[32px] shadow-2xl shadow-blue-500/10">
                                <header className="mb-8">
                                    <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
                                        <FileText className="h-6 w-6 text-blue-500" />
                                        Modelos
                                    </h2>
                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-1">Biblioteca de Templates</p>
                                </header>
                                <TemplateList initialTemplates={templates || []} companies={companies || []} />
                            </section>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
