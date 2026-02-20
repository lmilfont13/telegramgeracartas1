import { NextRequest, NextResponse } from 'next/server';
const { generateSaaSPDF } = require('../../../saas-pdf-generator');

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { text, logoUrl, carimbo1Url, carimbo2Url, stampPosition, compact } = body;

        // Gerar o PDF usando a lógica centralizada (mesma do Bot)
        const pdfBuffer = await generateSaaSPDF({
            text,
            logoUrl,
            carimbo1Url,
            carimbo2Url,
            stampPosition: stampPosition || 'ambos',
            compact: compact || false
        });

        return new NextResponse(pdfBuffer, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': 'attachment; filename=carta.pdf',
            },
        });
    } catch (error: any) {
        console.error('[API PDF] Erro:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
