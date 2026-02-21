import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { updateBot, updateToken } from "./actions";
import ImageUpload from "./ImageUpload";
import TemplateEditor from "./TemplateEditor";
import StoreManagement from "../../../empresa/[id]/StoreManagement";
import EmployeeUploadInteractive from "./EmployeeUploadInteractive";
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
    const { data: empresa } = await supabase.from('empresas').select('lojas, logo_url, carimbo_url, carimbo_funcionario_url').eq('id', bot.empresa_id).single();

    // Buscar template
    const { data: template } = await supabase.from('templates').select('*').eq('empresa_id', bot.empresa_id).maybeSingle();
    const templateTexto = template ? template.conteudo : "Olá {{NOME}}, seu pedido na {{LOJA}} foi processado em {{DATA}}.";

    // Buscar chaves disponíveis (placeholders) do último funcionário importado
    const { data: ultimoFuncionario } = await supabase
        .from('funcionarios')
        .select('dados_extras')
        .eq('empresa_id', bot.empresa_id)
        .order('criado_em', { ascending: false })
        .limit(1)
        .maybeSingle();

    const availablePlaceholders = ultimoFuncionario?.dados_extras
        ? Object.keys(ultimoFuncionario.dados_extras).filter(k =>
            !['nome', 'loja', 'cargo', 'rg', 'cpf', 'data', 'cdc', 'data_admissao', 'agencia', 'serie', 'carteira', 'numero_carteira_trabalho'].includes(k.toLowerCase())
        )
        : [];

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
                        <form action={updateBot} className="space-y-4">
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
                                <button type="submit" className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 transition-colors">
                                    Salvar Nome
                                </button>
                            </div>
                        </form>

                        <div className="mt-4 pt-4 border-t">
                            <label className="block text-sm font-medium text-gray-700">Token Telegram</label>
                            <form action={updateToken} className="mt-1 flex gap-2">
                                <input type="hidden" name="id" value={bot.id} />
                                <input
                                    name="token"
                                    defaultValue={bot.token_telegram}
                                    className="block w-full rounded-md border border-gray-300 bg-gray-50 p-2 text-gray-600 shadow-sm"
                                />
                                <button type="submit" className="rounded border bg-white px-3 py-2 text-sm hover:bg-gray-50 transition-colors">
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

                    {/* Gestão de Lojas */}
                    <StoreManagement empresaId={bot.empresa_id} initialLojas={empresa?.lojas || []} />

                    {/* Template da Carta */}
                    <TemplateEditor
                        botId={bot.id}
                        initialTemplate={templateTexto}
                        availablePlaceholders={availablePlaceholders}
                        action={handleSaveTemplate}
                    />

                    {/* Importação de Funcionários */}
                    <div className="rounded-lg border bg-white p-6 shadow-sm">
                        <h2 className="text-lg font-semibold mb-3">Base de Funcionários</h2>
                        <p className="text-sm text-gray-400 mb-6 font-medium leading-relaxed">
                            Importe os funcionários para esta marca. Você poderá mapear as colunas da sua planilha manualmente.
                        </p>

                        <EmployeeUploadInteractive botId={bot.id} />

                        <div className="mt-8">
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Últimos Importados</h3>
                            <EmployeeList botId={bot.id} />
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
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
