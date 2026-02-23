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
        <div className="min-h-screen bg-white">
            {/* SIDEBAR NAVIGATION */}
            <aside className="fixed left-0 top-0 hidden h-screen w-72 border-r border-gray-100 bg-gray-950 lg:block lg:z-40">
                <div className="flex h-full flex-col p-8">
                    <div className="mb-12 flex items-center gap-4">
                        <div className="h-12 w-12 bg-white rounded-xl flex items-center justify-center text-gray-950 shadow-2xl">
                            <Bot className="h-6 w-6 stroke-[2.5]" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black tracking-tighter text-white leading-none">GERAL</h1>
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mt-1.5">SaaS Engine</p>
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
                                className={`flex items-center gap-3 rounded-xl px-5 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${item.active
                                    ? 'bg-white text-gray-950 shadow-xl scale-[1.02]'
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                <item.icon className={`h-4 w-4 ${item.active ? 'stroke-[2.5]' : 'stroke-[2]'}`} />
                                {item.name}
                            </a>
                        ))}
                    </nav>

                    <div className="mt-auto pt-8 border-t border-white/10">
                        <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5 backdrop-blur-sm">
                            <div className="flex-1 overflow-hidden">
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none mb-1">{user.email?.split('@')[0]}</p>
                                <p className="text-[9px] text-white font-black uppercase tracking-[0.3em] opacity-80">ADMIN MASTER</p>
                            </div>
                            <form action="/auth/signout" method="post">
                                <button className="p-2 text-gray-500 hover:text-white transition-all hover:rotate-12">
                                    <LogOut className="h-4 w-4" />
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </aside>

            {/* MAIN CONTENT */}
            <main className="lg:pl-72">
                <header className="sticky top-0 z-30 flex h-24 items-center justify-between border-b border-gray-50 bg-white/50 backdrop-blur-xl px-12">
                    <div>
                        <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] mb-1">Central Console</h2>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-gray-950 uppercase tracking-tighter">System Overview</span>
                            <div className="h-1.5 w-1.5 rounded-full bg-gray-950 animate-pulse"></div>
                        </div>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-full border border-gray-100">
                            <div className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
                            <span className="text-[10px] font-black text-gray-950 uppercase tracking-widest">Live Engine</span>
                        </div>
                    </div>
                </header>

                <div className="p-12 max-w-[1400px] mx-auto">
                    {/* STATS HERO */}
                    <div className="mb-16 grid gap-8 md:grid-cols-3">
                        {[
                            { label: 'Active Brands', val: companiesCount, icon: Building2 },
                            { label: 'Bot Instances', val: botsCount, icon: Bot },
                            { label: 'Total Output', val: totalLetters, icon: FileText }
                        ].map((s, i) => (
                            <div key={i} className="group relative overflow-hidden bg-white p-10 rounded-3xl border border-gray-100 shadow-sm transition-all hover:shadow-2xl hover:shadow-gray-200/50 hover:-translate-y-1 duration-500">
                                <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity duration-500">
                                    <s.icon className="h-24 w-24" />
                                </div>
                                <div className="mb-8 h-12 w-12 bg-gray-50 text-gray-950 rounded-2xl flex items-center justify-center border border-gray-100 group-hover:bg-gray-950 group-hover:text-white transition-all duration-500">
                                    <s.icon className="h-5 w-5 stroke-[2.5]" />
                                </div>
                                <h3 className="text-5xl font-black text-gray-950 tabular-nums tracking-tighter mb-2 italic">
                                    {s.val || 0}
                                </h3>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">{s.label}</p>
                            </div>
                        ))}
                    </div>

                    <div className="grid gap-12 lg:grid-cols-12">
                        {/* BOTS COL */}
                        <div className="lg:col-span-12 xl:col-span-8 space-y-12">
                            <section>
                                <header className="flex items-center justify-between mb-10">
                                    <div className="flex flex-col">
                                        <h2 className="text-2xl font-black text-gray-950 uppercase tracking-tighter mb-1 select-none">
                                            Active Instances
                                        </h2>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Manage your telegram workers</p>
                                    </div>
                                    <div className="h-[1px] flex-1 bg-gray-100 mx-8 hidden sm:block"></div>
                                </header>

                                <div className="grid gap-6 md:grid-cols-2">
                                    {bots?.map((bot) => (
                                        <div key={bot.id} className="group relative bg-white p-8 rounded-3xl border border-gray-100 shadow-sm transition-all hover:border-gray-950 duration-500">
                                            <div className="mb-10 flex items-center justify-between">
                                                <div className="h-14 w-14 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-300 border border-gray-100 group-hover:bg-gray-950 group-hover:text-white group-hover:shadow-xl transition-all duration-500">
                                                    <Bot className="h-7 w-7 stroke-[1.5]" />
                                                </div>
                                                <div className="flex flex-col items-end">
                                                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all duration-500 ${bot.ativo ? 'bg-gray-950 text-white border-transparent' : 'bg-white text-gray-300 border-gray-100'}`}>
                                                        {bot.ativo ? 'Active' : 'Standby'}
                                                    </span>
                                                </div>
                                            </div>
                                            <h3 className="text-lg font-black text-gray-950 mb-6 uppercase tracking-tight">{bot.nome}</h3>
                                            <a href={`/bot/${bot.id}`} className="flex w-full items-center justify-center gap-3 rounded-2xl bg-gray-50 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-950 hover:bg-gray-950 hover:text-white transition-all duration-300 active:scale-[0.98]">
                                                <Settings2 className="h-4 w-4" />
                                                Control Center
                                            </a>
                                        </div>
                                    ))}

                                    <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-gray-200 bg-gray-50/30 p-8 text-center transition-all group hover:border-gray-400 hover:bg-white duration-500">
                                        <div className="h-14 w-14 rounded-2xl bg-white border border-gray-100 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:shadow-xl transition-all duration-500">
                                            <Plus className="h-6 w-6 text-gray-400 group-hover:text-gray-950" />
                                        </div>
                                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-6">Provision New Instance</h3>
                                        <form action={async (fd) => { 'use server'; await createBot(fd); }} className="w-full space-y-3">
                                            <input name="nome" placeholder="INSTANCE NAME" className="w-full rounded-2xl border border-transparent bg-white p-4 text-[10px] font-black uppercase tracking-widest focus:bg-white focus:border-gray-950 outline-none transition-all shadow-sm" required />
                                            <input name="token" placeholder="TELEGRAM API TOKEN" className="w-full rounded-2xl border border-transparent bg-white p-4 text-[11px] font-bold tracking-widest font-mono focus:bg-white focus:border-gray-950 outline-none transition-all shadow-sm" required />
                                            <button className="w-full rounded-2xl bg-gray-950 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white hover:bg-gray-800 transition-all active:scale-95 shadow-xl shadow-gray-200">
                                                Deploy Bot
                                            </button>
                                        </form>
                                    </div>
                                </div>
                            </section>

                            <section id="historico" className="bg-white p-10 rounded-[32px] border border-gray-100 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-8 opacity-[0.02]">
                                    <History className="h-32 w-32" />
                                </div>
                                <header className="flex items-center gap-4 mb-10">
                                    <div className="h-10 w-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-950 border border-gray-100 font-black italic">H</div>
                                    <div>
                                        <h2 className="text-xl font-black text-gray-950 uppercase tracking-tighter">Event Logs</h2>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Recent document generation</p>
                                    </div>
                                </header>
                                <RecentLetters initialLetters={cartas || []} />
                            </section>
                        </div>

                        {/* RIGHT COL */}
                        <div className="lg:col-span-12 xl:col-span-4 space-y-12">
                            <section id="marcas" className="bg-white p-10 rounded-[32px] border border-gray-100 shadow-sm overflow-hidden relative">
                                <header className="mb-10">
                                    <h2 className="text-xl font-black text-gray-950 tracking-tighter flex items-center gap-4 uppercase">
                                        <div className="h-10 w-10 bg-gray-950 rounded-xl flex items-center justify-center text-white">
                                            <Building2 className="h-5 w-5" />
                                        </div>
                                        Brands
                                    </h2>
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.4em] mt-3 pl-1">Identity & Stamp Assets</p>
                                </header>
                                <CompanyList initialCompanies={companies || []} />
                            </section>

                            <section id="modelos" className="bg-white p-10 rounded-[32px] border border-gray-100 shadow-sm overflow-hidden border-t-4 border-t-gray-950">
                                <header className="mb-10">
                                    <h2 className="text-xl font-black text-gray-950 tracking-tighter flex items-center gap-4 uppercase">
                                        <div className="h-10 w-10 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-center text-gray-950">
                                            <FileText className="h-5 w-5" />
                                        </div>
                                        Patterns
                                    </h2>
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.4em] mt-3 pl-1">Document Logic Templates</p>
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
