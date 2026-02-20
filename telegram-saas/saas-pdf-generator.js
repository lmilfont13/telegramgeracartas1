const PDFDocument = require('pdfkit');
const axios = require('axios');

/**
 * Downloads an image from a URL and returns as a Buffer
 * @param {string} url 
 * @returns {Promise<Buffer|null>}
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
 * Gera um PDF profissional a partir do texto da carta e imagens (URLs ou Buffers)
 */
async function generateSaaSPDF({ text, logoUrl, carimbo1Url, carimbo2Url, stampPosition = 'ambos', customCoords = null, compact = false }) {
    const logoBuffer = await downloadImage(logoUrl);
    const carimbo1Buffer = await downloadImage(carimbo1Url);
    const carimbo2Buffer = await downloadImage(carimbo2Url);

    const marginVal = compact ? 25 : 72;
    const fontSizeBody = compact ? 8 : 12;
    const startY = compact ? 60 : 140;

    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({
                size: 'A4',
                margins: { top: marginVal, bottom: marginVal, left: marginVal, right: marginVal },
                bufferPages: true
            });

            const chunks = [];
            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            // Logo - Left Aligned
            if (logoBuffer) {
                try {
                    doc.image(logoBuffer, marginVal, 35, { width: 130 });
                } catch (e) {
                    console.error(`[PDFGen] Erro ao inserir logo:`, e.message);
                }
            }

            // Data - Right Aligned
            const months = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
            const now = new Date();
            const dateStr = `Data de emissão: ${now.getDate()} DE ${months[now.getMonth()]} DE ${now.getFullYear()}`;

            doc.save();
            doc.font('Helvetica-Bold').fontSize(9).fillColor('black');
            doc.text(dateStr, marginVal, 60, { align: 'right' });
            doc.restore();

            doc.x = marginVal;
            doc.y = startY;

            /**
             * Renders rich text with bold support and justification
             */
            const renderRichText = (line, options = {}) => {
                const parts = line.split(/(\*\*.*?\*\*)/g);
                if (line.match(/^(AS LOJA|A\/C\.:|Ref\.:|Atenciosamente,)/i)) {
                    doc.font('Helvetica-Bold');
                }

                parts.forEach((part, index) => {
                    const isLast = index === parts.length - 1;
                    const combinedOptions = { ...options, continued: !isLast };

                    if (part.startsWith('**') && part.endsWith('**')) {
                        const content = part.slice(2, -2);
                        doc.font('Helvetica-Bold').text(content, combinedOptions);
                    } else if (part !== '' || isLast) {
                        doc.font('Helvetica').text(part, combinedOptions);
                    }
                });
                doc.font('Helvetica');
            };

            const lines = text.split('\n');
            let hasInlineStamps = false;
            let footerLines = [];

            // Detect and separate footer
            const bodyLines = [];
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                if (line.match(/(Rua|CEP|Campo Belo|São Paulo - SP|Terceirização|Merchandising)/i) && i > lines.length - 8) {
                    footerLines.push(line.trim());
                } else {
                    bodyLines.push(line);
                }
            }

            doc.fontSize(fontSizeBody);
            for (let line of bodyLines) {
                if (!line || line.trim() === '') {
                    doc.moveDown(0.4);
                    continue;
                }

                // Header lines (#)
                if (line.trim().startsWith('#')) {
                    doc.fontSize(compact ? 10 : 14).font('Helvetica-Bold')
                        .text(line.replace(/^#+\s*/, ''), { align: 'left' })
                        .moveDown(0.2);
                    doc.fontSize(fontSizeBody).font('Helvetica');
                    continue;
                }

                // Inline Stamps
                let extraY = 0;
                if (line.includes('{{CARIMBO_1}}') || line.includes('{{CARIMBO_2}}')) {
                    hasInlineStamps = true;
                    if (line.includes('{{CARIMBO_1}}') && carimbo1Buffer) {
                        const prefixWidth = doc.widthOfString(line.substring(0, line.indexOf('{{CARIMBO_1}}')).replace(/\*\*/g, ''));
                        doc.image(carimbo1Buffer, marginVal + prefixWidth, doc.y - 12, { width: 120, height: 60 });
                        line = line.replace('{{CARIMBO_1}}', '          ');
                        extraY = 40;
                    }
                    if (line.includes('{{CARIMBO_2}}') && carimbo2Buffer) {
                        const prefixWidth = doc.widthOfString(line.substring(0, line.indexOf('{{CARIMBO_2}}')).replace(/\*\*/g, ''));
                        doc.image(carimbo2Buffer, marginVal + prefixWidth, doc.y - 12, { width: 120, height: 60 });
                        line = line.replace('{{CARIMBO_2}}', '          ');
                        extraY = 40;
                    }
                }

                const options = {
                    align: 'justify',
                    indent: (line.length > 50 && !line.includes(':')) ? 30 : 0,
                    lineGap: compact ? -1.5 : 1
                };

                renderRichText(line, options);
                if (extraY > 0) doc.y += extraY;
            }

            // Stamps at bottom
            if (!hasInlineStamps) {
                let posY = doc.y + 20;
                const carHeight = 85;
                const carWidth = 160;
                if (posY > doc.page.height - 180) {
                    const diff = posY - (doc.page.height - 180);
                    if (diff < 30) posY -= (diff + 5); else { doc.addPage(); posY = marginVal; }
                }
                if (carimbo1Buffer && (stampPosition === 'ambos' || stampPosition === 'esquerda')) {
                    doc.image(carimbo1Buffer, marginVal, posY, { fit: [carWidth, carHeight] });
                }
                if (carimbo2Buffer && (stampPosition === 'ambos' || stampPosition === 'direita')) {
                    const tx = stampPosition === 'direita' ? (doc.page.width - marginVal - carWidth) : (doc.page.width - marginVal - carWidth);
                    doc.image(carimbo2Buffer, tx, posY, { fit: [carWidth, carHeight] });
                }
            }

            // Footer Address on first page
            if (footerLines.length > 0) {
                const cur = doc.bufferedPageCount - 1;
                doc.switchToPage(0);
                doc.fontSize(8).font('Helvetica').fillColor('gray')
                    .text(footerLines.join(' – '), marginVal, doc.page.height - 60, {
                        align: 'center', width: doc.page.width - (marginVal * 2)
                    });
                doc.switchToPage(cur);
            }

            doc.end();
        } catch (error) {
            console.error('[PDFGen] Fatal Error:', error);
            reject(error);
        }
    });
}

module.exports = { generateSaaSPDF };
