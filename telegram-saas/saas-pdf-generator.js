const PDFDocument = require('pdfkit');
const axios = require('axios');

/**
 * Downloads an image from a URL and returns as a Buffer
 */
async function downloadImage(urlOrBuffer) {
    if (!urlOrBuffer) return null;
    if (Buffer.isBuffer(urlOrBuffer)) return urlOrBuffer;
    try {
        const response = await axios.get(urlOrBuffer, { responseType: 'arraybuffer' });
        return Buffer.from(response.data);
    } catch (e) {
        console.error(`❌ Erro ao baixar imagem: ${urlOrBuffer}`, e.message);
        return null;
    }
}

/**
 * Gera um PDF profissional a partir do texto da carta e imagens
 */
async function generateSaaSPDF({ text, logoUrl, carimbo1Url, carimbo2Url, stampPosition = 'ambos', customCoords = null, compact = false }) {
    const logoBuffer = await downloadImage(logoUrl);
    const carimbo1Buffer = await downloadImage(carimbo1Url);
    const carimbo2Buffer = await downloadImage(carimbo2Url);

    // Configurações de layout
    const marginH = compact ? 30 : 72;
    const marginV = compact ? 25 : 60;
    const fontSizeBody = compact ? 10 : 12;
    const startY = compact ? 90 : 140;

    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({
                size: 'A4',
                margins: { top: marginV, bottom: marginV, left: marginH, right: marginH },
                bufferPages: true
            });

            const chunks = [];
            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            // --- 1. PRÉ-PROCESSAMENTO ---
            // Remove TODOS os placeholders de carimbo do texto para nunca aparecerem como texto bruto
            let cleanText = text
                .replace(/(\*\*)?\{\{CARIMBO_1\}\}(\*\*)?/g, '')
                .replace(/(\*\*)?\{\{CARIMBO_2\}\}(\*\*)?/g, '')
                .trim();

            const rawLines = cleanText.split('\n');
            let bodyLines = [];
            let footerText = "";

            // Identifica o rodapé (últimas linhas que parecem endereço)
            for (let i = 0; i < rawLines.length; i++) {
                const line = rawLines[i].trim();
                if (line.match(/(Rua Demóstenes|CEP 04614-013|São Paulo - SP|Terceirização)/i) && i > rawLines.length - 10) {
                    footerText = line;
                } else {
                    bodyLines.push(rawLines[i]);
                }
            }

            // --- 2. CABEÇALHO ---
            if (logoBuffer) {
                try {
                    doc.image(logoBuffer, marginH, 30, { width: 125 });
                } catch (e) { console.error(e); }
            }

            const months = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
            const now = new Date();
            const dateStr = `Data de emissão: ${now.getDate()} DE ${months[now.getMonth()]} DE ${now.getFullYear()}`;

            doc.font('Helvetica-Bold').fontSize(9).fillColor('black');
            doc.text(dateStr, marginH, 50, { align: 'right' });

            doc.y = startY;
            doc.fontSize(fontSizeBody).font('Helvetica');

            // --- 3. CORPO DA CARTA ---
            bodyLines.forEach((line) => {
                if (line.trim() === '') {
                    doc.moveDown(0.5);
                    return;
                }

                // Header automático (#)
                if (line.trim().startsWith('#')) {
                    doc.font('Helvetica-Bold').fontSize(fontSizeBody + 2)
                        .text(line.replace(/^#+\s*/, ''), { align: 'left' })
                        .moveDown(0.3);
                    doc.font('Helvetica').fontSize(fontSizeBody);
                    return;
                }

                // Opções de renderização
                const isHeaderLine = line.match(/^(AS LOJA|A\/C\.:|Ref\.:|Atenciosamente,)/i);
                const options = {
                    align: isHeaderLine ? 'left' : 'justify',
                    indent: (!isHeaderLine && line.trim().length > 50) ? 35 : 0,
                    lineGap: compact ? -1 : 1.5
                };

                // Renderização com Negrito Inline
                const parts = line.split(/(\*\*.*?\*\*)/g);
                if (isHeaderLine) doc.font('Helvetica-Bold');

                parts.forEach((part, index) => {
                    const isLast = index === parts.length - 1;
                    const textOptions = { ...options, continued: !isLast };

                    if (part.startsWith('**') && part.endsWith('**')) {
                        doc.font('Helvetica-Bold').text(part.slice(2, -2), textOptions);
                    } else if (part !== '' || isLast) {
                        if (!isHeaderLine) doc.font('Helvetica');
                        doc.text(part, textOptions);
                    }
                });

                doc.font('Helvetica'); // Reset
            });

            // --- 4. CARIMBOS (FINAL DA PÁGINA) ---
            let posY = doc.y + 30;
            const carWidth = 160;
            const carHeight = 85;

            // Se não couber, tenta reduzir margem ou sobe um pouco
            if (posY > doc.page.height - 180) {
                if (posY > doc.page.height - 130) {
                    // Se estiver muito embaixo, tenta subir um pouco o ponto de inserção
                    posY = doc.page.height - 185;
                }
            }

            if (carimbo1Buffer && (stampPosition === 'esquerda' || stampPosition === 'ambos')) {
                doc.image(carimbo1Buffer, marginH, posY, { fit: [carWidth, carHeight] });
            }
            if (carimbo2Buffer && (stampPosition === 'direita' || stampPosition === 'ambos')) {
                const targetX = doc.page.width - marginH - carWidth;
                doc.image(carimbo2Buffer, targetX, posY, { fit: [carWidth, carHeight] });
            }

            // --- 5. RODAPÉ FIXO (TOTALMENTE AO FUNDO) ---
            if (footerText) {
                // Força escrita na primeira página para garantir rodapé limpo
                const lastPage = doc.bufferedPageCount - 1;
                doc.switchToPage(0);

                doc.fontSize(8).fillColor('gray').font('Helvetica');
                doc.text(footerText, marginH, doc.page.height - 45, {
                    align: 'center',
                    width: doc.page.width - (marginH * 2)
                });

                doc.switchToPage(lastPage);
            }

            doc.end();
        } catch (error) {
            console.error('[PDFGen] Fatal Error:', error);
            reject(error);
        }
    });
}

module.exports = { generateSaaSPDF };
