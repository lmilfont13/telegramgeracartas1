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

    // Ajuste de margens
    const marginV = compact ? 20 : 60;
    const marginH = compact ? 25 : 72;
    const fontSizeBody = compact ? 9.5 : 12;
    const startY = compact ? 85 : 140;

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

            // --- CABEÇALHO ---
            if (logoBuffer) {
                try {
                    doc.image(logoBuffer, marginH, 30, { width: 120 });
                } catch (e) { console.error(e); }
            }

            const months = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
            const now = new Date();
            const dateStr = `Data de emissão: ${now.getDate()} DE ${months[now.getMonth()]} DE ${now.getFullYear()}`;

            doc.font('Helvetica-Bold').fontSize(9).fillColor('black');
            doc.text(dateStr, marginH, 50, { align: 'right' });

            doc.y = startY;
            doc.font('Helvetica').fontSize(fontSizeBody).fillColor('black');

            // --- PROCESSAMENTO DO TEXTO ---
            const rawLines = text.split('\n');
            let footerCandidate = "";

            // Filtro de rodapé mais restrito (apenas se for uma das últimas 5 linhas)
            const bodyLines = [];
            for (let i = 0; i < rawLines.length; i++) {
                const line = rawLines[i].trim();
                const isFooterAddress = line.match(/(Rua Demóstenes|CEP 04614-013|São Paulo - SP)/i) && i > rawLines.length - 6;
                if (isFooterAddress) {
                    footerCandidate = line;
                } else {
                    bodyLines.push(rawLines[i]);
                }
            }

            // Renderização
            for (let line of bodyLines) {
                if (line.trim() === '') {
                    doc.moveDown(0.4);
                    continue;
                }

                if (line.trim().startsWith('#')) {
                    doc.font('Helvetica-Bold').fontSize(fontSizeBody + 2)
                        .text(line.replace(/^#+\s*/, ''), { align: 'left' })
                        .moveDown(0.2);
                    doc.font('Helvetica').fontSize(fontSizeBody);
                    continue;
                }

                const options = {
                    align: 'justify',
                    indent: (line.trim().length > 60 && !line.includes(':')) ? 35 : 0,
                    lineGap: compact ? -1.5 : 1.5
                };

                const parts = line.split(/(\*\*.*?\*\*)/g);
                if (line.match(/^(AS LOJA|A\/C\.:|Ref\.:|Atenciosamente,)/i)) {
                    doc.font('Helvetica-Bold');
                }

                parts.forEach((part, index) => {
                    const isLast = index === parts.length - 1;
                    const textOptions = { ...options, continued: !isLast };

                    if (part.startsWith('**') && part.endsWith('**')) {
                        doc.font('Helvetica-Bold').text(part.slice(2, -2), textOptions);
                    } else if (part !== '' || isLast) {
                        doc.font('Helvetica').text(part, textOptions);
                    }
                });

                if (line.includes('{{CARIMBO_1}}') || line.includes('{{CARIMBO_2}}')) {
                    doc.moveDown(4);
                }
            }

            // --- CARIMBOS ---
            let posY = doc.y + 20;
            const carWidth = 160;
            const carHeight = 85;

            if (posY > doc.page.height - 180) {
                if (posY > doc.page.height - 140) {
                    doc.addPage();
                    posY = marginV + 20;
                } else {
                    posY = doc.page.height - 180; // Força no final da página atual se couber raspando
                }
            }

            if (carimbo1Buffer && (stampPosition === 'esquerda' || stampPosition === 'ambos')) {
                doc.image(carimbo1Buffer, marginH, posY, { fit: [carWidth, carHeight] });
            }
            if (carimbo2Buffer && (stampPosition === 'direita' || stampPosition === 'ambos')) {
                const targetX = doc.page.width - marginH - carWidth;
                doc.image(carimbo2Buffer, targetX, posY, { fit: [carWidth, carHeight] });
            }

            // --- RODAPÉ FIXO ---
            if (footerCandidate) {
                // Cálculo robusto do número de páginas
                const totalPageCount = doc.bufferedPageCount || (doc._pages ? doc._pages.length : 1);

                doc.switchToPage(0); // Volta para a primeira página

                doc.fontSize(8).fillColor('gray').font('Helvetica');
                doc.text(footerCandidate, marginH, doc.page.height - 50, {
                    align: 'center',
                    width: doc.page.width - (marginH * 2)
                });

                // Retorna para a última página se necessário (para fechar o doc corretamente)
                if (totalPageCount > 1 && !isNaN(totalPageCount)) {
                    doc.switchToPage(totalPageCount - 1);
                }
            }

            doc.end();
        } catch (error) {
            console.error('[PDFGen] Erro Fatal:', error);
            reject(error);
        }
    });
}

module.exports = { generateSaaSPDF };
