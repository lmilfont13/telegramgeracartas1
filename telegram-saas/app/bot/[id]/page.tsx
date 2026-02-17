import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { updateBot, updateToken } from "./actions";
import ImageUpload from "./ImageUpload";
import TemplateEditor from "./TemplateEditor";
import { uploadLogo, uploadCarimbo, uploadCarimboFuncionario } from "./upload-images";

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
    const { data: empresa } = await supabase.from('empresas').select('logo_url, carimbo_url, carimbo_funcionario_url').eq('id', bot.empresa_id).single();

    // Buscar template
    const { data: template } = await supabase.from('templates').select('*').eq('empresa_id', bot.empresa_id).maybeSingle();
    const templateTexto = template ? template.conteudo : "Olá {{NOME}}, seu pedido na {{LOJA}} foi processado em {{DATA}}.";

    async function handleUploadEmployees(fd: FormData) {
        'use server'
        await uploadEmployees(fd)
    }

    // Ação específica para o TemplateEditor (passada como prop)
    async function handleSaveTemplate(fd: FormData) {
        'use server'
        return await updateBot(fd)
    }

    return (
        <div className="min-h-screen bg-gray-50 p-8 text-black">
            <div className="mx-auto max-w-3xl">
                <Link href="/" className="text-sm text-blue-600 hover:underline mb-4 block">
                    &larr; Voltar para Dashboard
                </Link>

                <div className="mb-8 flex items-center justify-between">
                    <h1 className="text-3xl font-bold">{bot.nome}</h1>
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${bot.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {bot.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                </div>

                <div className="grid gap-6">

                    {/* Configurações Básicas */}
                    <div className="rounded-lg border bg-white p-6 shadow-sm">
                        <h2 className="text-lg font-semibold mb-4">Configurações</h2>
                        <form action={async (fd) => { 'use server'; await updateBot(fd); }} className="space-y-4">
                            <input type="hidden" name="id" value={bot.id} />
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Nome do Bot</label>
                                <input
                                    name="nome"
                                    defaultValue={bot.nome}
                                    className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div className="flex justify-end">
                                <button className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 transition-colors">
                                    Salvar Nome
                                </button>
                            </div>
                        </form>

                        <div className="mt-4 pt-4 border-t">
                            <label className="block text-sm font-medium text-gray-700">Token Telegram</label>
                            <form action={async (fd) => { 'use server'; await updateToken(fd); }} className="mt-1 flex gap-2">
                                <input type="hidden" name="id" value={bot.id} />
                                <input
                                    name="token"
                                    defaultValue={bot.token_telegram}
                                    className="block w-full rounded-md border border-gray-300 bg-gray-50 p-2 text-gray-600 shadow-sm"
                                />
                                <button className="rounded border bg-white px-3 py-2 text-sm hover:bg-gray-50 transition-colors">
                                    Atualizar Token
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Logo da Empresa */}
                    <ImageUpload
                        botId={bot.id}
                        currentUrl={empresa?.logo_url}
                        label="Logo da Empresa"
                        description="Imagem que aparecerá no cabeçalho das cartas (PNG recomendado)."
                        action={uploadLogo}
                        fieldName="logo"
                        buttonColor="bg-blue-600"
                    />

                    {/* Carimbo / Assinatura */}
                    <ImageUpload
                        botId={bot.id}
                        currentUrl={empresa?.carimbo_url}
                        label="Carimbo/Assinatura"
                        description="Imagem que aparecerá no rodapé das cartas (PNG transparente recomendado)."
                        action={uploadCarimbo}
                        fieldName="carimbo"
                        buttonColor="bg-green-600"
                    />

                    {/* Carimbo do Funcionário Responsável */}
                    <ImageUpload
                        botId={bot.id}
                        currentUrl={empresa?.carimbo_funcionario_url}
                        label="Assinatura do Funcionário"
                        description="Assinatura do funcionário responsável que aparecerá nas cartas (PNG transparente recomendado)."
                        action={uploadCarimboFuncionario}
                        fieldName="carimbo_funcionario"
                        buttonColor="bg-purple-600"
                    />


                    {/* Template da Carta */}
                    <TemplateEditor
                        botId={bot.id}
                        initialTemplate={templateTexto}
                        action={handleSaveTemplate}
                    />

                    {/* Importação de Funcionários */}
                    <div className="rounded-lg border bg-white p-6 shadow-sm">
                        <h2 className="text-lg font-semibold mb-4">Base de Funcionários</h2>
                        <p className="text-sm text-gray-500 mb-4">
                            Importe uma planilha (Excel ou CSV) com os dados dos funcionários. <br />
                            Colunas esperadas: <strong>Nome, Loja, Data Admissão, Cargo</strong>.
                        </p>

                        <UploadForm botId={bot.id} action={handleUploadEmployees} />

                        <div className="mt-6">
                            <h3 className="text-sm font-medium text-gray-900 mb-2">Últimos Importados</h3>
                            <EmployeeList botId={bot.id} />
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}

import { uploadEmployees } from "./upload-employees";

function UploadForm({ botId, action }: { botId: string, action: (fd: FormData) => Promise<void> }) {
    return (
        <form action={action} className="flex gap-4 items-end">
            <input type="hidden" name="bot_id" value={botId} />
            <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Arquivo (XLSX, CSV)</label>
                <input
                    type="file"
                    name="file"
                    accept=".xlsx,.xls,.csv"
                    className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-full file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
                    required
                />
            </div>
            <button className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700 mb-[2px]">
                Importar
            </button>
        </form>
    )
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
        return <p className="text-sm text-gray-400 italic">Nenhum funcionário cadastrado.</p>
    }

    return (
        <div className="overflow-hidden rounded-md border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Loja</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Cargo</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                    {funcionarios.map((f) => (
                        <tr key={f.id}>
                            <td className="px-3 py-2 text-sm text-gray-900">{f.nome}</td>
                            <td className="px-3 py-2 text-sm text-gray-500">{f.loja || '-'}</td>
                            <td className="px-3 py-2 text-sm text-gray-500">{f.cargo || '-'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
