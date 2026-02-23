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
        <div className="min-h-screen bg-white p-8 font-sans">
            <div className="max-w-3xl mx-auto">
                <div className="mb-12 flex flex-col items-center text-center">
                    <div className="h-12 w-12 bg-gray-950 rounded-xl flex items-center justify-center text-white mb-6">
                        <Wand2 className="w-6 h-6" />
                    </div>
                    <h1 className="text-4xl font-black text-gray-950 tracking-tighter uppercase mb-2">
                        Ad Generator
                    </h1>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">High-conversion copy for Telegram</p>
                </div>

                <div className="grid gap-8">
                    <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Product URL</label>
                                <input
                                    type="text"
                                    value={productUrl}
                                    onChange={(e) => setProductUrl(e.target.value)}
                                    placeholder="https://www.amazon.com.br/..."
                                    className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl text-sm font-bold text-gray-950 outline-none focus:bg-white focus:border-gray-950 transition-all placeholder:text-gray-300"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Affiliate Link</label>
                                <input
                                    type="text"
                                    value={affiliateLink}
                                    onChange={(e) => setAffiliateLink(e.target.value)}
                                    placeholder="https://amzn.to/..."
                                    className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl text-sm font-bold text-gray-950 outline-none focus:bg-white focus:border-gray-950 transition-all placeholder:text-gray-300"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">
                                    Groq API Key <span className="text-gray-300 font-medium">(optional)</span>
                                </label>
                                <input
                                    type="password"
                                    value={groqApiKey}
                                    onChange={(e) => setGroqApiKey(e.target.value)}
                                    placeholder="gsk_..."
                                    className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl text-sm font-bold text-gray-950 outline-none focus:bg-white focus:border-gray-950 transition-all placeholder:text-gray-300"
                                />
                            </div>

                            <button
                                onClick={handleGenerate}
                                disabled={loading || !productUrl}
                                className="w-full bg-gray-950 hover:bg-gray-800 text-white font-black py-4 rounded-xl flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-30 disabled:pointer-events-none text-xs uppercase tracking-[0.2em]"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <Wand2 className="w-4 h-4" />
                                        Generate Ad
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 text-xs font-bold uppercase tracking-widest text-center animate-in zoom-in-95">
                            Error: {error}
                        </div>
                    )}

                    {result && (
                        <div className="grid gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                                <div className="px-8 py-4 border-b border-gray-100 flex items-center justify-between">
                                    <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Generated Copy</h2>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={copyToClipboard}
                                            className="p-2 text-gray-400 hover:text-gray-950 hover:bg-gray-50 rounded-lg transition-all"
                                            title="Copy to clipboard"
                                        >
                                            <Copy className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={handlePostToTelegram}
                                            disabled={posting || posted}
                                            className={`flex items-center gap-2 text-[10px] font-black px-5 py-2 rounded-lg transition-all active:scale-95 uppercase tracking-widest ${posted
                                                ? 'bg-green-50 text-green-600'
                                                : 'bg-gray-950 text-white hover:bg-gray-800'
                                                }`}
                                        >
                                            {posting ? (
                                                <Loader2 className="w-3 h-3 animate-spin" />
                                            ) : posted ? (
                                                <CheckCircle className="w-3 h-3" />
                                            ) : (
                                                <Send className="w-3 h-3" />
                                            )}
                                            {posting ? 'Posting...' : posted ? 'Posted!' : 'Push to Channel'}
                                        </button>
                                    </div>
                                </div>

                                <div className="p-8">
                                    <div className="bg-gray-50 p-6 rounded-xl border border-transparent whitespace-pre-wrap font-mono text-sm text-gray-800 leading-relaxed">
                                        {result.adCopy}
                                    </div>
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col items-center justify-center">
                                    <h3 className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-4 w-full text-center">Visual Identity</h3>
                                    {result.image && (
                                        <div className="relative aspect-square w-full max-w-[200px] bg-gray-50 rounded-xl overflow-hidden flex items-center justify-center p-4">
                                            <img
                                                src={result.image}
                                                alt="Product"
                                                className="w-full h-full object-contain"
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
                                    <h3 className="text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">Extracted Data</h3>
                                    <div className="grid grid-cols-2 gap-3 text-center">
                                        <div className="bg-gray-50 p-4 rounded-xl">
                                            <span className="block text-[8px] text-gray-400 uppercase font-black tracking-widest mb-1">Price</span>
                                            <span className="text-sm font-black text-gray-950">R$ {result.price}</span>
                                        </div>
                                        <div className="bg-gray-50 p-4 rounded-xl">
                                            <span className="block text-[8px] text-gray-400 uppercase font-black tracking-widest mb-1">Status</span>
                                            <span className="text-[10px] font-black text-gray-950 uppercase">{result.installments ? 'Installments' : 'Direct'}</span>
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 p-4 rounded-xl">
                                        <span className="block text-[8px] text-gray-400 uppercase font-black tracking-widest mb-1">Original Title</span>
                                        <p className="text-[10px] font-bold text-gray-600 line-clamp-2 leading-relaxed">{result.title}</p>
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
