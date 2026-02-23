import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { createBot } from "./actions";
import TemplateList from "./TemplateList";
import CompanyList from "./CompanyList";
import RecentLetters from "./RecentLetters";
import { FileText, Bot, Plus, History, Settings2, Building2, LogOut, LayoutDashboard, Database, Activity } from "lucide-react";

export default async function Dashboard() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return redirect("/login");

    const { data: bots, count: botsCount } = await supabase.from("bots").select("*", { count: 'exact' }).order('criado_em', { ascending: false });
    const { data: companies, count: companiesCount } = await supabase.from("empresas").select("id, nome, logo_url, criado_em", { count: 'exact' }).order('criado_em', { ascending: false });
    const { data: templates } = await supabase.from("templates").select("id, nome, conteudo, empresa_id, criado_em").order('criado_em', { ascending: false });
    const { count: totalLetters } = await supabase.from("cartas_geradas").select("*", { count: 'exact', head: true });
    const { data: cartas } = await supabase.from("cartas_geradas").select("*").order('criado_em', { ascending: false }).limit(8);

    return (
        <div className="min-h-screen bg-[#FDFDFD] text-gray-950 font-sans selection:bg-black selection:text-white">
            {/* ELEGANT SIDEBAR */}
            <aside className="fixed left-0 top-0 hidden h-screen w-[280px] bg-[#0A0A0A] lg:block lg:z-50 border-r border-black/5">
                <div className="flex h-full flex-col px-8 py-10">
                    <div className="mb-14 px-2">
                        <div className="flex items-center gap-3">
                            <div className="h-9 w-9 bg-white rounded-lg flex items-center justify-center">
                                <Bot className="h-5 w-5 text-black stroke-[2.5]" />
                            </div>
                            <span className="text-lg font-black tracking-[-0.04em] text-white uppercase italic">SaaS.PRO</span>
                        </div>
                    </div>

                    <nav className="flex-1 space-y-1">
                        {[
                            { name: 'PAINEL', icon: LayoutDashboard, href: '#', active: true },
                            { name: 'MARCAS', icon: Building2, href: '#marcas' },
                            { name: 'MODELOS', icon: Database, href: '#modelos' },
                            { name: 'HISTÓRICO', icon: History, href: '#historico' },
                        ].map((item) => (
                            <a
                                key={item.name}
                                href={item.href}
                                className={`flex items-center gap-4 rounded-xl px-5 py-4 text-[10px] font-bold uppercase tracking-[0.25em] transition-all duration-300 group ${item.active
                                    ? 'bg-white text-black shadow-[0_20px_40px_-10px_rgba(255,255,255,0.15)] scale-[1.03]'
                                    : 'text-gray-500 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                <item.icon className={`h-4 w-4 ${item.active ? 'stroke-[2.5]' : 'stroke-[1.5]'}`} />
                                {item.name}
                            </a>
                        ))}
                    </nav>

                    <div className="mt-auto px-2">
                        <div className="pt-8 border-t border-white/5 flex items-center justify-between">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">{user.email?.split('@')[0]}</span>
                                <span className="text-[9px] text-white/20 font-bold uppercase tracking-[0.1em]">ADMIN</span>
                            </div>
                            <form action="/auth/signout" method="post">
                                <button className="p-2.5 text-gray-500 hover:text-white transition-colors bg-white/5 rounded-lg hover:bg-white/10">
                                    <LogOut className="h-4 w-4" />
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </aside>

            {/* MAIN CONTENT AREA */}
            <main className="lg:pl-[280px]">
                {/* PRESTIGE HEADER */}
                <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-100 flex h-20 items-center justify-between px-10">
                    <div className="flex items-center gap-3">
                        <div className="h-2 w-2 rounded-full bg-black animate-pulse"></div>
                        <h2 className="text-[10px] font-black uppercase tracking-[0.5em] text-gray-400">PAINEL DE CONTROLE</h2>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 px-3 py-1.5 border border-gray-100 rounded-full bg-gray-50">
                            STABLE v.4.2
                        </div>
                        <div className="h-9 w-9 rounded-full bg-black flex items-center justify-center text-white text-[11px] font-black border-4 border-gray-50">
                            {user.email?.[0].toUpperCase()}
                        </div>
                    </div>
                </header>

                <div className="p-10 max-w-[1600px] mx-auto">
                    {/* MONOCHROME STATS HUD */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
                        {[
                            { label: 'MARCAS ATIVAS', val: companiesCount, icon: Building2 },
                            { label: 'INSTÂNCIAS BOT', val: botsCount, icon: Bot },
                            { label: 'CARTAS GERADAS', val: totalLetters, icon: FileText }
                        ].map((s, i) => (
                            <div key={i} className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.05)] transition-all duration-500 group relative overflow-hidden">
                                <div className="absolute -right-6 -top-6 text-gray-50 opacity-0 group-hover:opacity-100 transition-all duration-700 transform group-hover:rotate-12">
                                    <s.icon className="h-32 w-32 stroke-[0.5]" />
                                </div>
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="h-11 w-11 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center group-hover:bg-black group-hover:text-white transition-all duration-500">
                                        <s.icon className="h-5 w-5 stroke-[2]" />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 group-hover:text-black transition-colors">{s.label}</span>
                                </div>
                                <div className="text-5xl font-black italic tracking-tighter text-black tabular-nums">{s.val || 0}</div>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-12 gap-12">
                        {/* LEFT COLUMN: MEUS BOTS & ATIVIDADE RECENTE */}
                        <div className="col-span-12 xl:col-span-8 space-y-12">
                            <section>
                                <div className="flex items-center justify-between mb-8 px-2">
                                    <div className="flex items-center gap-4">
                                        <div className="h-8 w-1 bg-black rounded-full"></div>
                                        <h3 className="text-2xl font-black uppercase tracking-tighter text-black">MEUS BOTS</h3>
                                    </div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Cloud Workers Instanciados</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {bots?.map((bot) => (
                                        <div key={bot.id} className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm transition-all hover:border-black duration-500 group">
                                            <div className="flex justify-between items-start mb-8">
                                                <div className="h-16 w-16 rounded-3xl bg-gray-50 flex items-center justify-center border border-gray-100 group-hover:bg-black group-hover:text-white transition-all duration-500">
                                                    <Bot className="h-8 w-8 stroke-[1.5]" />
                                                </div>
                                                <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] border transition-all duration-500 ${bot.ativo ? 'bg-black text-white border-transparent' : 'bg-gray-50 text-gray-400 border-gray-100'}`}>
                                                    {bot.ativo ? 'CONECTADO' : 'OFFLINE'}
                                                </div>
                                            </div>
                                            <h4 className="text-xl font-black text-black uppercase tracking-tight mb-8 line-clamp-1">{bot.nome}</h4>
                                            <a href={`/bot/${bot.id}`} className="flex w-full items-center justify-center gap-3 py-4.5 rounded-[20px] bg-black text-white text-[10px] font-black uppercase tracking-[0.25em] transform active:scale-[0.97] transition-all hover:bg-neutral-800">
                                                <Settings2 className="h-4 w-4" />
                                                CONFIGURAR INSTÂNCIA
                                            </a>
                                        </div>
                                    ))}

                                    {/* NOVA INSTÂNCIA CARD */}
                                    <div className="bg-gray-50/50 border-2 border-dashed border-gray-200 p-8 rounded-[40px] flex flex-col items-center justify-center text-center group hover:bg-white hover:border-black transition-all duration-500">
                                        <div className="h-16 w-16 rounded-3xl bg-white border border-gray-100 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:shadow-xl transition-all duration-500 shadow-sm">
                                            <Plus className="h-7 w-7 text-gray-300 group-hover:text-black" />
                                        </div>
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-8">NOVA INSTÂNCIA</span>
                                        <form action={async (fd) => { 'use server'; await createBot(fd); }} className="w-full space-y-3 px-2">
                                            <input name="nome" placeholder="NOME DO BOT" className="w-full p-4.5 rounded-2xl bg-white border border-transparent focus:border-black outline-none text-[10px] font-black uppercase tracking-widest shadow-sm transition-all" required />
                                            <input name="token" placeholder="TOKEN DO TELEGRAM" className="w-full p-4.5 rounded-2xl bg-white border border-transparent focus:border-black outline-none text-[10px] font-bold font-mono tracking-tighter shadow-sm transition-all" required />
                                            <button className="w-full py-4.5 rounded-2xl bg-neutral-200 text-neutral-500 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-black hover:text-white transition-all">CRIAR BOT</button>
                                        </form>
                                    </div>
                                </div>
                            </section>

                            {/* ATIVIDADE RECENTE (HISTÓRICO) */}
                            <section id="historico" className="bg-white p-12 rounded-[48px] border border-gray-100 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-10 opacity-[0.03]">
                                    <History className="h-24 w-24 text-black" />
                                </div>
                                <div className="flex items-center gap-5 mb-12">
                                    <div className="h-12 w-12 rounded-2xl bg-gray-50 flex items-center justify-center border border-gray-100">
                                        <History className="h-6 w-6 text-black stroke-[2]" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black uppercase tracking-tighter text-black">ATIVIDADE RECENTE</h3>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Fluxo global de documentos</p>
                                    </div>
                                </div>
                                <RecentLetters initialLetters={cartas || []} />
                            </section>
                        </div>

                        {/* RIGHT COLUMN: MARCAS & MODELOS */}
                        <div className="col-span-12 xl:col-span-4 space-y-12">
                            <section id="marcas" className="bg-white p-10 rounded-[48px] border border-gray-100 shadow-sm h-fit">
                                <header className="mb-12 flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <h3 className="text-2xl font-black uppercase tracking-tighter text-black">MARCAS</h3>
                                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em] mt-2">Configurações Visuais e Carimbos</span>
                                    </div>
                                    <div className="h-12 w-12 bg-black text-white rounded-2xl flex items-center justify-center shadow-2xl shadow-black/10">
                                        <Building2 className="h-6 w-6" />
                                    </div>
                                </header>
                                <CompanyList initialCompanies={companies || []} />
                            </section>

                            <section id="modelos" className="bg-white p-10 rounded-[48px] border border-black shadow-sm h-fit">
                                <header className="mb-12 flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <h3 className="text-2xl font-black uppercase tracking-tighter text-black">MODELOS</h3>
                                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em] mt-2">Lógica de Documentos</span>
                                    </div>
                                    <div className="h-12 w-12 bg-gray-50 border border-gray-100 text-black rounded-2xl flex items-center justify-center">
                                        <Database className="h-6 w-6" />
                                    </div>
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
