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
                margins: { top: 20, bottom: 20, left: 60, right: 60 },
                bufferPages: true
            });

            const chunks = [];
            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            const mH = 65;
            const mV = 20;
            const pageWidth = doc.page.width;
            const pageHeight = doc.page.height;
            const textWidth = pageWidth - (mH * 2);
            const carHeight = 85;
            const carWidth = 155;

            // --- 1. PREPARAÇÃO DO TEXTO E RODAPÉ ---
            let footerText = "";
            let cleanText = text
                .replace(/\*\*\{\{CARIMBO_1\}\}\*\*/g, '{{CARIMBO_1}}')
                .replace(/\*\*\{\{CARIMBO_2\}\}\*\*/g, '{{CARIMBO_2}}');

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
            const startY = 115;
            const footerY = pageHeight - 40;
            const minStampsSpace = carHeight + 10;
            const availableHeight = footerY - startY - 5;

            const estimateHeight = (fs, lg) => {
                let h = 0;
                bodyLines.forEach(line => {
                    const t = line.trim();
                    if (t === '') {
                        h += (fs * 0.5);
                    } else if (t.includes('{{CARIMBO_1}}') || t.includes('{{CARIMBO_2}}')) {
                        h += carHeight + 10;
                    } else {
                        const lineH = doc.fontSize(fs).heightOfString(t, {
                            width: textWidth,
                            align: 'justify',
                            lineGap: lg,
                            indent: (t.length > 50 && !t.match(/^(AS LOJA|A\/C\.:|Ref\.:|Atenciosamente,)/i)) ? 35 : 0
                        });
                        h += lineH + 2.5; // Espaço entre parágrafos
                    }
                });
                return h;
            };

            // Base settings
            let fontSize = compact ? 11.0 : 12.0;
            let lineGap = compact ? 0.8 : 1.5;
            let totalH = estimateHeight(fontSize, lineGap);

            // A. DOWNWARD SCALING: Se for grande demais, encolhe
            while (totalH + minStampsSpace > availableHeight && fontSize > 7.5) {
                fontSize -= 0.5;
                lineGap -= 0.3;
                if (lineGap < -1.8) lineGap = -1.8;
                totalH = estimateHeight(fontSize, lineGap);
            }

            // B. UPWARD SCALING: Se for pequeno demais, aumenta para preencher a página
            if (!compact && totalH + minStampsSpace < (availableHeight * 0.7) && fontSize < 14) {
                while (totalH + minStampsSpace < (availableHeight * 0.85) && fontSize < 13.5) {
                    fontSize += 0.25;
                    lineGap += 0.25;
                    totalH = estimateHeight(fontSize, lineGap);
                }
            }

            // --- 3. RENDERIZAÇÃO ---
            // Logo
            if (logoBuffer) {
                try { doc.image(logoBuffer, mH, 25, { width: 105 }); } catch (e) { }
            }
            // Data
            const months = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
            const now = new Date();
            const dateStr = `Data de emissão: ${now.getDate()} DE ${months[now.getMonth()]} DE ${now.getFullYear()}`;
            doc.font('Helvetica-Bold').fontSize(9).text(dateStr, mH, 40, { align: 'right' });

            doc.y = startY;
            doc.fontSize(fontSize).font('Helvetica');

            let renderedCar1 = false;
            let renderedCar2 = false;

            bodyLines.forEach(line => {
                const trimmed = line.trim();
                if (trimmed === '') {
                    doc.moveDown(0.4);
                    return;
                }

                // Renderização de Carimbos (DINÂMICA)
                if (trimmed.includes('{{CARIMBO_1}}') || trimmed.includes('{{CARIMBO_2}}')) {
                    const currentY = doc.y;
                    const regex = /\{\{(CARIMBO_[12])\}\}/g;
                    let match;
                    let matches = [];
                    while ((match = regex.exec(trimmed)) !== null) {
                        matches.push({ key: match[1], index: match.index });
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

                    doc.y += carHeight + 10;
                    return;
                }

                // Títulos (#)
                if (trimmed.startsWith('#')) {
                    doc.font('Helvetica-Bold').fontSize(fontSize + 1.5)
                        .text(trimmed.replace(/^#+\s*/, ''), { align: 'left' })
                        .moveDown(0.2);
                    doc.font('Helvetica').fontSize(fontSize);
                    return;
                }

                const isHeading = trimmed.match(/^(AS LOJA|A\/C\.:|Ref\.:|Atenciosamente,)/i);
                const options = {
                    align: isHeading ? 'left' : 'justify',
                    indent: (!isHeading && trimmed.length > 50) ? 35 : 0,
                    lineGap: lineGap
                };

                // Inline Bold (Rich Text)
                const parts = line.split(/(\*\*.*?\*\*)/g);
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
                doc.moveDown(0.3);
            });

            // Enforce Page 1
            if (doc.bufferedPageCount > 1) {
                doc.switchToPage(0);
            }

            // Fallback para Carimbos
            if ((!renderedCar1 && carimbo1Buffer) || (!renderedCar2 && carimbo2Buffer)) {
                let finalY = Math.max(doc.y + 20, footerY - carHeight - 20);
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
