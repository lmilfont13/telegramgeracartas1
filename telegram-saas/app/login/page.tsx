import { login, signup } from './actions'

export default async function LoginPage({
    searchParams,
}: {
    searchParams: Promise<{ message: string; error?: string }>
}) {
    const params = await searchParams;
    return (
        <div className="flex min-h-screen items-center justify-center p-4">
            <div className="w-full max-w-md space-y-8 bg-white p-10 rounded-3xl border border-gray-100 shadow-2xl shadow-blue-500/10">
                <div className="text-center space-y-2">
                    <div className="mx-auto w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200 mb-6">
                        <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <h1 className="text-4xl font-black tracking-tight text-gray-950 uppercase">
                        SaaS <span className="text-blue-600">Bot</span>
                    </h1>
                    <p className="text-sm text-gray-400 font-bold uppercase tracking-widest">
                        Painel Administrativo
                    </p>
                </div>

                {params?.message && (
                    <div className="rounded-2xl border border-green-100 bg-green-50 p-4 text-green-700 text-sm font-bold animate-in fade-in slide-in-from-top-2">
                        {params.message}
                    </div>
                )}

                {params?.error && (
                    <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-red-700 text-sm font-bold animate-in fade-in slide-in-from-top-2">
                        {params.error}
                    </div>
                )}

                <form className="mt-8 space-y-6">
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="email-address" className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">
                                Email
                            </label>
                            <input
                                id="email-address"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                className="block w-full rounded-2xl border-2 border-gray-100 bg-gray-50 py-3.5 px-4 text-gray-900 placeholder-gray-400 focus:border-blue-600 focus:bg-white focus:ring-0 transition-all font-semibold outline-none"
                                placeholder="exemplo@email.com"
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">
                                Senha
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                className="block w-full rounded-2xl border-2 border-gray-100 bg-gray-50 py-3.5 px-4 text-gray-900 placeholder-gray-400 focus:border-blue-600 focus:bg-white focus:ring-0 transition-all font-semibold outline-none"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        <button
                            formAction={login}
                            className="w-full rounded-2xl bg-blue-600 py-4 text-sm font-black text-white hover:bg-blue-700 transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-blue-200"
                        >
                            ENTRAR NO PAINEL
                        </button>
                        <button
                            formAction={signup}
                            className="w-full rounded-2xl bg-white border-2 border-gray-100 py-4 text-sm font-black text-gray-600 hover:bg-gray-50 hover:border-gray-200 transition-all active:scale-[0.98]"
                        >
                            CRIAR NOVA CONTA
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
