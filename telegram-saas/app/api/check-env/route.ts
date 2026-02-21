import { NextResponse } from 'next/server';

export async function GET() {
    const envStatus = {
        NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        DASHBOARD_PASSWORD: !!process.env.DASHBOARD_PASSWORD,
        TELEGRAM_BOT_TOKEN: !!process.env.TELEGRAM_BOT_TOKEN,
        TELEGRAM_CHANNEL_ID: !!process.env.TELEGRAM_CHANNEL_ID,
    };

    const allConfigured = Object.values(envStatus).every(v => v === true);

    return NextResponse.json({
        status: allConfigured ? 'success' : 'warning',
        message: allConfigured ? 'Todas as variáveis essenciais estão presentes.' : 'Algumas variáveis de ambiente estão faltando.',
        config: envStatus,
        node_env: process.env.NODE_ENV,
        vercel_env: process.env.VERCEL_ENV || 'local'
    });
}
