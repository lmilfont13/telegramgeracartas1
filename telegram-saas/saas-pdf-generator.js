const PDFDocument = require('pdfkit');
const axios = require('axios');

/**
 * Downloads an image from a URL and returns as a Buffer
 */
async function downloadImage(urlOrBuffer) {
    if (!urlOrBuffer) return null;
    if (Buffer.isBuffer(urlOrBuffer)) return urlOrBuffer;
    try {
        const response = await axios.get(urlOrBuffer, { responseType: 'arraybuffer', timeout: 5000 });
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
    const fontSizeBody = compact ? 10.5 : 12;
    const startY = compact ? 100 : 140;

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

            // --- 1. LIMPEZA DE TEXTO E PLACEHOLDERS ---
            // Remove placeholders de carimbo e as marcas de negrito que podem sobrar neles
            let cleanText = text
                .replace(/\*\*\{\{CARIMBO_1\}\}\*\*/g, '')
                .replace(/\*\*\{\{CARIMBO_2\}\}\*\*/g, '')
                .replace(/\{\{CARIMBO_1\}\}/g, '')
                .replace(/\{\{CARIMBO_2\}\}/g, '')
                .trim();

            const rawLines = cleanText.split('\n');
            let bodyLines = [];
            let footerText = "";

            // Identifica o rodapé (endereço)
            for (let i = 0; i < rawLines.length; i++) {
                const line = rawLines[i].trim();
                if (line.match(/(Rua Demóstenes|CEP 04614-013|São Paulo - SP|Terceirização)/i) && i > rawLines.length - 8) {
                    footerText = line;
                } else {
                    bodyLines.push(rawLines[i]);
                }
            }

            // --- 2. CABEÇALHO ---
            if (logoBuffer) {
                try {
                    doc.image(logoBuffer, marginH, 30, { width: 120 });
                } catch (e) { console.error(e); }
            }

            const months = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
            const now = new Date();
            const dateStr = `Data de emissão: ${now.getDate()} DE ${months[now.getMonth()]} DE ${now.getFullYear()}`;

            doc.font('Helvetica-Bold').fontSize(9);
            doc.text(dateStr, marginH, 50, { align: 'right' });

            doc.y = startY;
            doc.fontSize(fontSizeBody).font('Helvetica');

            // --- 3. CORPO ---
            bodyLines.forEach((line) => {
                const trimmed = line.trim();
                if (trimmed === '') {
                    doc.moveDown(0.5);
                    return;
                }

                // Header (#)
                if (trimmed.startsWith('#')) {
                    doc.font('Helvetica-Bold').fontSize(fontSizeBody + 2)
                        .text(trimmed.replace(/^#+\s*/, ''), { align: 'left', continued: false })
                        .moveDown(0.3);
                    doc.font('Helvetica').fontSize(fontSizeBody);
                    return;
                }

                const isHeading = trimmed.match(/^(AS LOJA|A\/C\.:|Ref\.:|Atenciosamente,)/i);
                const options = {
                    align: isHeading ? 'left' : 'justify',
                    indent: (!isHeading && trimmed.length > 50) ? 35 : 0,
                    lineGap: compact ? -1 : 1
                };

                const parts = line.split(/(\*\*.*?\*\*)/g);
                if (isHeading) doc.font('Helvetica-Bold');

                parts.forEach((part, index) => {
                    const isLast = index === parts.length - 1;
                    const textOptions = { ...options, continued: !isLast };

                    if (part.startsWith('**') && part.endsWith('**')) {
                        doc.font('Helvetica-Bold').text(part.slice(2, -2), textOptions);
                    } else if (part !== '' || isLast) {
                        if (!isHeading) doc.font('Helvetica');
                        doc.text(part, textOptions);
                    }
                });
                doc.font('Helvetica');
                doc.moveDown(0.2); // Espaço entre parágrafos
            });

            // --- 4. CARIMBOS ---
            let posY = doc.y + 35;
            const carWidth = 160;
            const carHeight = 85;

            // Garante que não ultrapasse o rodapé
            if (posY > doc.page.height - 185) {
                // Se sobrar pouco espaço, tenta subir um pouco ou cria nova página se for inviável
                if (posY > doc.page.height - 120) {
                    doc.addPage();
                    posY = marginV + 30;
                } else {
                    posY = doc.page.height - 190;
                }
            }

            if (carimbo1Buffer && (stampPosition === 'esquerda' || stampPosition === 'ambos')) {
                doc.image(carimbo1Buffer, marginH, posY, { fit: [carWidth, carHeight] });
            }
            if (carimbo2Buffer && (stampPosition === 'direita' || stampPosition === 'ambos')) {
                const targetX = doc.page.width - marginH - carWidth;
                doc.image(carimbo2Buffer, targetX, posY, { fit: [carWidth, carHeight] });
            }

            // --- 5. RODAPÉ FIXO ---
            if (footerText) {
                // FALLBACK ROBUSTO PARA NÚMERO DE PÁGINAS
                const totalPages = doc.bufferedPageCount || 1;
                const lastIdx = (!isNaN(totalPages) && totalPages > 0) ? (totalPages - 1) : 0;

                doc.switchToPage(0); // Sempre na primeira página
                doc.fontSize(8).fillColor('gray').font('Helvetica');
                doc.text(footerText, marginH, doc.page.height - 50, {
                    align: 'center',
                    width: doc.page.width - (marginH * 2)
                });

                doc.switchToPage(lastIdx);
            }

            doc.end();
        } catch (error) {
            console.error('[PDFGen] Erro:', error);
            reject(error);
        }
    });
}

module.exports = { generateSaaSPDF };
