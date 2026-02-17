import { login, signup } from './actions'

export default async function LoginPage({
    searchParams,
}: {
    searchParams: Promise<{ message: string; error?: string }>
}) {
    const params = await searchParams;
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-900 p-8 text-white">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center">
                    <h1 className="text-4xl font-bold tracking-tight text-blue-500">
                        Bot SaaS
                    </h1>
                    <p className="mt-2 text-sm text-gray-400">
                        Painel Administrativo de Bots Telegram
                    </p>
                </div>

                {params?.message && (
                    <div className="rounded border border-green-400 bg-green-100 p-4 text-green-700">
                        {params.message}
                    </div>
                )}

                {params?.error && (
                    <div className="rounded border border-red-400 bg-red-100 p-4 text-red-700">
                        {params.error}
                    </div>
                )}

                <form className="mt-8 space-y-6">
                    <div className="-space-y-px rounded-md shadow-sm">
                        <div>
                            <label htmlFor="email-address" className="sr-only">
                                Email
                            </label>
                            <input
                                id="email-address"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                className="relative block w-full rounded-t-md border-0 bg-gray-800 py-3 px-3 text-white placeholder-gray-500 focus:z-10 focus:ring-2 focus:ring-blue-500 sm:text-sm"
                                placeholder="Email address"
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="sr-only">
                                Password
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                className="relative block w-full rounded-b-md border-0 bg-gray-800 py-3 px-3 text-white placeholder-gray-500 focus:z-10 focus:ring-2 focus:ring-blue-500 sm:text-sm"
                                placeholder="Password"
                            />
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <button
                            formAction={login}
                            className="group relative flex w-full justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        >
                            Sign in
                        </button>
                        <button
                            formAction={signup}
                            className="group relative flex w-full justify-center rounded-md border border-gray-600 bg-transparent py-2 px-4 text-sm font-medium text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        >
                            Sign up
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
