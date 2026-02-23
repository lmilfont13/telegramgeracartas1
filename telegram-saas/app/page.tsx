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
        <div className="min-h-screen bg-[#F8F9FA] text-[#1A1C1E] selection:bg-black selection:text-white">
            {/* SIDEBAR COMPACTA (240px) */}
            <aside className="fixed left-0 top-0 hidden h-screen w-[240px] bg-[#0F1113] lg:block lg:z-50 border-r border-[#1E2124]">
                <div className="flex h-full flex-col p-6">
                    <div className="mb-10 flex items-center gap-3 px-2">
                        <div className="h-7 w-7 bg-white rounded flex items-center justify-center">
                            <Bot className="h-4 w-4 text-black" />
                        </div>
                        <span className="text-sm font-bold tracking-tight text-white uppercase italic">SaaS.pro</span>
                    </div>

                    <nav className="flex-1 space-y-0.5">
                        {[
                            { name: 'PAINEL', icon: LayoutDashboard, href: '#', active: true },
                            { name: 'MARCAS', icon: Building2, href: '#marcas' },
                            { name: 'MODELOS', icon: Database, href: '#modelos' },
                            { name: 'HISTÓRICO', icon: History, href: '#historico' },
                        ].map((item) => (
                            <a
                                key={item.name}
                                href={item.href}
                                className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider transition-all duration-200 ${item.active
                                    ? 'bg-[#1E2124] text-white border border-[#2D3135]'
                                    : 'text-[#808489] hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                <item.icon className={`h-3.5 w-3.5 ${item.active ? 'text-white' : ''}`} />
                                {item.name}
                            </a>
                        ))}
                    </nav>

                    <div className="mt-auto border-t border-[#1E2124] pt-6 flex items-center justify-between px-2">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-white leading-none mb-1">{user.email?.split('@')[0].toUpperCase()}</span>
                            <span className="text-[9px] text-[#4F5359] font-bold uppercase tracking-widest">SYSTEM ADMIN</span>
                        </div>
                        <form action="/auth/signout" method="post">
                            <button className="text-[#4F5359] hover:text-white transition-colors">
                                <LogOut className="h-4 w-4" />
                            </button>
                        </form>
                    </div>
                </div>
            </aside>

            {/* MAIN CONTENT AREA */}
            <main className="lg:pl-[240px]">
                {/* HEADER MINIMALISTA */}
                <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-[#E2E4E6] flex h-14 items-center justify-between px-8">
                    <div className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-[#10B981]"></div>
                        <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#60646C]">DASHBOARD / OVERVIEW</h2>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="hidden sm:flex items-center gap-4 text-[9px] font-bold uppercase tracking-widest text-[#90949C]">
                            <div className="flex items-center gap-1.5"><Activity className="h-3 w-3" /> API: UP</div>
                        </div>
                        <div className="h-7 w-7 rounded-md bg-black flex items-center justify-center text-white text-[10px] font-bold">
                            {user.email?.[0].toUpperCase()}
                        </div>
                    </div>
                </header>

                <div className="p-8 max-w-[1400px] mx-auto space-y-6">
                    {/* METRIC BAR (LINEAR STYLE) */}
                    <div className="grid grid-cols-3 bg-white border border-[#E2E4E6] rounded-xl overflow-hidden divide-x divide-[#E2E4E6]">
                        {[
                            { label: 'MARCAS', val: companiesCount, icon: Building2 },
                            { label: 'WORKERS', val: botsCount, icon: Bot },
                            { label: 'CARTAS', val: totalLetters, icon: FileText }
                        ].map((s, i) => (
                            <div key={i} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-default group">
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-bold text-[#90949C] uppercase tracking-widest mb-1">{s.label}</span>
                                    <span className="text-xl font-bold tracking-tight text-black tabular-nums">{s.val || 0}</span>
                                </div>
                                <s.icon className="h-5 w-5 text-[#E2E4E6] group-hover:text-black transition-colors" />
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-12 gap-6">
                        {/* LEFT: WORKERS & HISTORY */}
                        <div className="col-span-12 xl:col-span-8 flex flex-col gap-6">
                            <section className="bg-white border border-[#E2E4E6] rounded-xl p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-black">GERENCIAMENTO DE WORKERS</h3>
                                    <span className="text-[9px] font-bold text-[#90949C] uppercase tracking-wider">INSTÂNCIAS ATIVAS NO TELEGRAM</span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {bots?.map((bot) => (
                                        <div key={bot.id} className="bg-white border border-[#E2E4E6] rounded-lg p-5 flex flex-col justify-between hover:border-black transition-colors group">
                                            <div className="flex justify-between items-center mb-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-md bg-gray-50 border border-[#E2E4E6] flex items-center justify-center group-hover:bg-black group-hover:text-white transition-colors">
                                                        <Bot className="h-4 w-4" />
                                                    </div>
                                                    <span className="text-[12px] font-bold text-black uppercase tracking-tight">{bot.nome}</span>
                                                </div>
                                                <div className={`h-1.5 w-1.5 rounded-full ${bot.ativo ? 'bg-[#10B981]' : 'bg-gray-200'}`}></div>
                                            </div>
                                            <a href={`/bot/${bot.id}`} className="w-full py-2.5 rounded-md border border-[#E2E4E6] text-[10px] font-bold text-[#60646C] text-center uppercase tracking-widest hover:bg-black hover:text-white hover:border-black transition-all">
                                                INSTÂNCIA
                                            </a>
                                        </div>
                                    ))}

                                    {/* COMPACT ADD BOT */}
                                    <div className="bg-gray-50/50 border border-dashed border-[#E2E4E6] rounded-lg p-5 flex flex-col">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="h-8 w-8 rounded-md bg-white border border-[#E2E4E6] flex items-center justify-center"><Plus className="h-4 w-4 text-[#C0C4C9]" /></div>
                                            <span className="text-[10px] font-bold text-[#90949C] uppercase tracking-[0.15em]">NOVA INSTÂNCIA</span>
                                        </div>
                                        <form action={async (fd) => { 'use server'; await createBot(fd); }} className="space-y-2">
                                            <input name="nome" placeholder="NOME" className="w-full bg-white border border-[#E2E4E6] rounded-md px-3 py-2 text-[10px] font-bold uppercase outline-none focus:border-black" required />
                                            <input name="token" placeholder="TOKEN" className="w-full bg-white border border-[#E2E4E6] rounded-md px-3 py-2 text-[9px] font-mono outline-none focus:border-black" required />
                                            <button className="w-full py-2 rounded-md bg-white border border-[#E2E4E6] text-[9px] font-bold text-[#90949C] uppercase hover:bg-black hover:text-white hover:border-black transition-all">CRIAR</button>
                                        </form>
                                    </div>
                                </div>
                            </section>

                            <section id="historico" className="bg-white border border-[#E2E4E6] rounded-xl overflow-hidden flex flex-col h-full min-h-[400px]">
                                <div className="p-6 border-b border-[#E2E4E6]">
                                    <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-black">ATIVIDADE RECENTE / AUDIT</h3>
                                </div>
                                <div className="flex-1 overflow-auto">
                                    <RecentLetters initialLetters={cartas || []} />
                                </div>
                            </section>
                        </div>

                        {/* RIGHT: RESOURCES (NARROW) */}
                        <div className="col-span-12 xl:col-span-4 flex flex-col gap-6">
                            <section id="marcas" className="bg-white border border-[#E2E4E6] rounded-xl p-6">
                                <div className="flex items-center justify-between mb-8">
                                    <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-black">MARCAS</h3>
                                    <Building2 className="h-4 w-4 text-[#C0C4C9]" />
                                </div>
                                <CompanyList initialCompanies={companies || []} />
                            </section>

                            <section id="modelos" className="bg-white border border-[#E2E4E6] rounded-xl p-6">
                                <div className="flex items-center justify-between mb-8">
                                    <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-black">MODELOS LÓGICOS</h3>
                                    <Database className="h-4 w-4 text-[#C0C4C9]" />
                                </div>
                                <TemplateList initialTemplates={templates || []} companies={companies || []} />
                            </section>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
