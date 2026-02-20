'use client';

import { useState } from 'react';
import { Copy, Loader2, Wand2, Send, CheckCircle } from 'lucide-react';
import Image from 'next/image';

export default function AdGeneratorPage() {
    const [productUrl, setProductUrl] = useState('');
    const [affiliateLink, setAffiliateLink] = useState('');
    const [groqApiKey, setGroqApiKey] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState('');
    const [posting, setPosting] = useState(false);
    const [posted, setPosted] = useState(false);

    const handleGenerate = async () => {
        setLoading(true);
        setError('');
        setResult(null);
        setPosted(false);

        try {
            const response = await fetch('/api/generate-ad', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productUrl, affiliateLink, groqApiKey }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Erro ao gerar anúncio');
            }

            setResult(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handlePostToTelegram = async () => {
        if (!result) return;
        setPosting(true);
        setError('');

        try {
            const response = await fetch('/api/post-to-telegram', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    adCopy: result.adCopy,
                    image: result.image
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Erro ao postar no canal');
            }

            setPosted(true);
            setTimeout(() => setPosted(false), 5000);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setPosting(false);
        }
    };

    const copyToClipboard = () => {
        if (result?.adCopy) {
            navigator.clipboard.writeText(result.adCopy);
            alert('Copiado para a área de transferência!');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8 font-sans">
            <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white text-center">
                    <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
                        <Wand2 className="w-8 h-8" />
                        Gerador de Anúncios Telegram
                    </h1>
                    <p className="mt-2 opacity-90">Crie copys de alta conversão para Amazon, Mercado Livre e Shopee</p>
                </div>

                <div className="p-8 space-y-6">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">URL do Produto</label>
                            <input
                                type="text"
                                value={productUrl}
                                onChange={(e) => setProductUrl(e.target.value)}
                                placeholder="https://www.amazon.com.br/..."
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Seu Link de Afiliado</label>
                            <input
                                type="text"
                                value={affiliateLink}
                                onChange={(e) => setAffiliateLink(e.target.value)}
                                placeholder="https://amzn.to/..."
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Groq API Key <span className="text-gray-400 font-normal">(opcional se configurado no sistema)</span>
                            </label>
                            <input
                                type="password"
                                value={groqApiKey}
                                onChange={(e) => setGroqApiKey(e.target.value)}
                                placeholder="gsk_..."
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                            />
                        </div>

                        <button
                            onClick={handleGenerate}
                            disabled={loading || !productUrl}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Gerando Mágica...
                                </>
                            ) : (
                                <>
                                    <Wand2 className="w-5 h-5" />
                                    Gerar Anúncio
                                </>
                            )}
                        </button>
                    </div>

                    {error && (
                        <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-100">
                            Erro: {error}
                        </div>
                    )}

                    {result && (
                        <div className="mt-8 border border-gray-200 rounded-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex flex-wrap justify-between items-center gap-4">
                                <h2 className="font-semibold text-gray-700">Resultado Gerado</h2>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={copyToClipboard}
                                        className="text-gray-600 hover:text-gray-800 flex items-center gap-1 text-sm font-medium transition px-3 py-1 rounded-md hover:bg-gray-200"
                                    >
                                        <Copy className="w-4 h-4" />
                                        Copiar
                                    </button>
                                    <button
                                        onClick={handlePostToTelegram}
                                        disabled={posting || posted}
                                        className={`flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-lg transition shadow-sm ${posted
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:opacity-90 active:scale-95'
                                            }`}
                                    >
                                        {posting ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Enviando...
                                            </>
                                        ) : posted ? (
                                            <>
                                                <CheckCircle className="w-4 h-4" />
                                                Postado!
                                            </>
                                        ) : (
                                            <>
                                                <Send className="w-4 h-4" />
                                                Enviar para o Canal
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                            <div className="p-6 grid md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Preview da Copy</h3>
                                    <div className="bg-white p-4 rounded-lg border border-gray-200 whitespace-pre-wrap font-mono text-sm text-gray-800 shadow-sm leading-relaxed">
                                        {result.adCopy}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Dados Extraídos</h3>
                                    <div className="space-y-3">
                                        {result.image && (
                                            <div className="relative aspect-square w-full bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm flex items-center justify-center p-4">
                                                <img
                                                    src={result.image}
                                                    alt="Produto data"
                                                    className="w-full h-full object-contain"
                                                />
                                            </div>
                                        )}

                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div className="bg-gray-50 p-3 rounded">
                                                <span className="block text-gray-500 text-xs">Preço</span>
                                                <span className="font-bold text-green-600">R$ {result.price}</span>
                                            </div>
                                            <div className="bg-gray-50 p-3 rounded">
                                                <span className="block text-gray-500 text-xs">Parcelamento</span>
                                                <span className="font-medium">{result.installments || 'N/A'}</span>
                                            </div>
                                        </div>

                                        <div className="bg-gray-50 p-3 rounded text-sm">
                                            <span className="block text-gray-500 text-xs mb-1">Título Original</span>
                                            <p className="line-clamp-2 text-gray-700">{result.title}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
