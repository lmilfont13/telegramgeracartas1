const PDFDocument = require('pdfkit');
const axios = require('axios');

/**
 * Downloads an image from a URL and returns as a Buffer
 */
async function downloadImage(urlOrBuffer) {
    if (!urlOrBuffer) return null;
    if (Buffer.isBuffer(urlOrBuffer)) return urlOrBuffer;
    try {
        const response = await axios.get(urlOrBuffer, { responseType: 'arraybuffer', timeout: 10000 });
        return Buffer.from(response.data);
    } catch (e) {
        console.error(`❌ Erro ao baixar imagem: ${urlOrBuffer}`, e.message);
        return null;
    }
}

/**
 * Gera um PDF profissional a partir do texto da carta e imagens.
 * GARANTE PÁGINA ÚNICA E POSICIONAMENTO DINÂMICO DOS CARIMBOS.
 */
async function generateSaaSPDF({ text, logoUrl, carimbo1Url, carimbo2Url, stampPosition = 'ambos', customCoords = null, compact = false }) {
    const logoBuffer = await downloadImage(logoUrl);
    const carimbo1Buffer = await downloadImage(carimbo1Url);
    const carimbo2Buffer = await downloadImage(carimbo2Url);

    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({
                size: 'A4',
                margins: { top: 25, bottom: 25, left: 60, right: 60 },
                bufferPages: true
            });

            const chunks = [];
            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            const mH = 65;
            const mV = 25;
            const pageWidth = doc.page.width;
            const pageHeight = doc.page.height;
            const textWidth = pageWidth - (mH * 2);
            const carHeight = 85;
            const carWidth = 155;

            // --- 1. PREPARAÇÃO DO TEXTO E RODAPÉ ---
            let footerText = "";
            // Regex flexível para limpar negritos em volta de carimbos
            let cleanText = text
                .replace(/\*\*\{\{\s*CARIMBO_[12]\s*\}\}\*\*/gi, (m) => m.replace(/\*\*/g, ''))
                .trim();

            const rawLines = cleanText.split('\n');
            const bodyLines = [];
            for (let i = 0; i < rawLines.length; i++) {
                const line = rawLines[i].trim();
                // Identifica o rodapé de endereço
                if (line.match(/(Rua Demóstenes|CEP 04614-013|São Paulo - SP|Terceirização|POP TRADE)/i) && i > rawLines.length - 8) {
                    footerText = line;
                } else {
                    bodyLines.push(rawLines[i]);
                }
            }

            // --- 2. CÁLCULO DE ESPAÇO E ESCALONAMENTO ---
            const startY = 120;
            const footerY = pageHeight - 45;
            const minStampsSpace = carHeight + 15;
            const availableHeight = footerY - startY - 10;

            const estimateHeight = (fs, lg) => {
                let h = 0;
                bodyLines.forEach(line => {
                    const t = line.trim();
                    if (t === '') {
                        h += (fs * 0.6);
                    } else if (t.match(/\{\{\s*CARIMBO_[12]\s*\}\}/i)) {
                        h += carHeight + 15;
                    } else {
                        const lineH = doc.fontSize(fs).heightOfString(t, {
                            width: textWidth,
                            align: 'justify',
                            lineGap: lg,
                            indent: (t.length > 50 && !t.match(/^(AS LOJA|A\/C\.:|Ref\.:|Atenciosamente,)/i)) ? 35 : 0
                        });
                        h += lineH + 3.5;
                    }
                });
                return h;
            };

            // Base settings
            let fontSize = 11.5;
            let lineGap = 1.5;
            let totalH = estimateHeight(fontSize, lineGap);

            // A. DOWNWARD SCALING
            while (totalH + minStampsSpace > availableHeight && fontSize > 7.5) {
                fontSize -= 0.5;
                lineGap -= 0.3;
                if (lineGap < -1.5) lineGap = -1.5;
                totalH = estimateHeight(fontSize, lineGap);
            }

            // B. UPWARD SCALING (Preencher mais a página)
            if (totalH + minStampsSpace < (availableHeight * 0.70)) {
                while (totalH + minStampsSpace < (availableHeight * 0.88) && fontSize < 14.5) {
                    fontSize += 0.25;
                    lineGap += 0.25;
                    totalH = estimateHeight(fontSize, lineGap);
                }
            }

            // --- 3. RENDERIZAÇÃO ---
            // Logo
            if (logoBuffer) {
                try { doc.image(logoBuffer, mH, 30, { width: 110 }); } catch (e) { }
            }
            // Data
            const months = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
            const now = new Date();
            const dateStr = `Data de emissão: ${now.getDate()} DE ${months[now.getMonth()]} DE ${now.getFullYear()}`;
            doc.font('Helvetica-Bold').fontSize(9).text(dateStr, mH, 45, { align: 'right' });

            doc.y = startY;
            doc.fontSize(fontSize).font('Helvetica');

            let renderedCar1 = false;
            let renderedCar2 = false;

            bodyLines.forEach(line => {
                const trimmed = line.trim();
                const hasStamp = trimmed.match(/\{\{\s*(CARIMBO_[12])\s*\}\}/i);

                if (trimmed === '') {
                    doc.moveDown(0.5);
                    return;
                }

                const currentY = doc.y;

                // Renderização de Carimbos
                if (hasStamp) {
                    const regex = /\{\{\s*(CARIMBO_[12])\s*\}\}/gi;
                    let match;
                    let matches = [];
                    while ((match = regex.exec(trimmed)) !== null) {
                        matches.push({ key: match[1].toUpperCase(), index: match.index });
                    }
                    matches.sort((a, b) => a.index - b.index);

                    matches.forEach((m, i) => {
                        const buffer = m.key === 'CARIMBO_1' ? carimbo1Buffer : carimbo2Buffer;
                        if (!buffer) return;
                        const targetX = (i === 0) ? mH : (pageWidth - mH - carWidth);
                        doc.image(buffer, targetX, currentY, { fit: [carWidth, carHeight] });
                        if (m.key === 'CARIMBO_1') renderedCar1 = true;
                        if (m.key === 'CARIMBO_2') renderedCar2 = true;
                    });
                }

                // Títulos (#)
                if (trimmed.startsWith('#')) {
                    doc.font('Helvetica-Bold').fontSize(fontSize + 1.5)
                        .text(trimmed.replace(/^#+\s*/, ''), { align: 'left' })
                        .moveDown(0.3);
                    doc.font('Helvetica').fontSize(fontSize);
                    return;
                }

                const isHeading = trimmed.match(/^(AS LOJA|A\/C\.:|Ref\.:|Atenciosamente,)/i);

                // Se o texto for curto demais, não Justifica (evita gaps feios)
                const shouldJustify = !isHeading && trimmed.length > 50;

                const options = {
                    align: shouldJustify ? 'justify' : 'left',
                    indent: (!isHeading && trimmed.length > 50) ? 35 : 0,
                    lineGap: lineGap
                };

                // Remove placeholders do texto para não aparecerem "escritos"
                let textToRender = line.replace(/\{\{\s*CARIMBO_[12]\s*\}\}/gi, '');

                if (textToRender.trim() === '' && hasStamp) {
                    doc.y += carHeight + 15;
                    return;
                }

                // Inline Bold
                const parts = textToRender.split(/(\*\*.*?\*\*)/g);
                if (isHeading) doc.font('Helvetica-Bold');

                parts.forEach((part, index) => {
                    const isLast = index === parts.length - 1;
                    const textOpts = { ...options, continued: !isLast };

                    if (part.startsWith('**') && part.endsWith('**')) {
                        doc.font('Helvetica-Bold').text(part.slice(2, -2), textOpts);
                    } else if (part !== '' || isLast) {
                        if (!isHeading) doc.font('Helvetica');
                        doc.text(part, textOpts);
                    }
                });

                if (hasStamp) {
                    doc.y = Math.max(doc.y, currentY + carHeight + 15);
                } else {
                    doc.moveDown(0.4);
                }
            });

            // Enforce Page 1
            if (doc.bufferedPageCount > 1) doc.switchToPage(0);

            // Fallback Carimbos
            if ((!renderedCar1 && carimbo1Buffer) || (!renderedCar2 && carimbo2Buffer)) {
                let finalY = Math.max(doc.y + 25, footerY - carHeight - 20);
                if (!renderedCar1 && carimbo1Buffer) {
                    doc.image(carimbo1Buffer, mH, finalY, { fit: [carWidth, carHeight] });
                }
                if (!renderedCar2 && carimbo2Buffer) {
                    doc.image(carimbo2Buffer, pageWidth - mH - carWidth, finalY, { fit: [carWidth, carHeight] });
                }
            }

            // Rodapé Final
            if (footerText) {
                doc.fontSize(8.5).fillColor('gray').font('Helvetica');
                doc.text(footerText, mH, footerY, {
                    align: 'center',
                    width: pageWidth - (mH * 2)
                });
            }

            doc.end();
        } catch (error) {
            console.error('[PDFGen] Erro Fatal:', error);
            reject(error);
        }
    });
}

module.exports = { generateSaaSPDF };
