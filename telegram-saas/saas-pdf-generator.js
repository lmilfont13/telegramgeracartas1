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
 * @param {Object} options 
 * @param {string} options.text - Texto completo da carta
 * @param {Buffer} options.logoUrl - Buffer do logo (mantido nome por compatibilidade)
 * @param {Buffer} options.carimbo1Url - Buffer do carimbo da empresa
 * @param {Buffer} options.carimbo2Url - Buffer do carimbo do funcionário
 * @param {string} options.stampPosition - 'esquerda', 'direita', 'ambos' ou 'personalizado'
 * @param {Object} options.customCoords - { x, y } para posição personalizada
 * @returns {Promise<Buffer>} - Buffer do PDF gerado
 */
async function generateSaaSPDF({ text, logoUrl, carimbo1Url, carimbo2Url, stampPosition = 'ambos', customCoords = null, compact = false }) {
    // Baixar imagens antecipadamente (ou usar buffers se fornecidos)
    const logoBuffer = await downloadImage(logoUrl);
    const carimbo1Buffer = await downloadImage(carimbo1Url);
    const carimbo2Buffer = await downloadImage(carimbo2Url);

    const marginVal = compact ? 25 : 72;
    const fontSizeBody = compact ? 8 : 12;
    const lineGap = compact ? -1.5 : 2;
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
                    console.log(`[PDFGen] Logo inserida.`);
                } catch (e) {
                    console.error(`[PDFGen] Erro ao inserir logo:`, e.message);
                }
            }

            // Data - Right Aligned with formatting
            const months = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
            const now = new Date();
            const dateStr = `Data de emissão: ${now.getDate()} DE ${months[now.getMonth()]} DE ${now.getFullYear()}`;

            doc.save();
            doc.font('Helvetica-Bold').fontSize(9).fillColor('black');
            doc.text(dateStr, doc.page.width - marginVal - 250, 60, {
                width: 250,
                align: 'right'
            });
            doc.restore();

            doc.x = marginVal;
            doc.y = startY;

            doc.font('Helvetica');
            doc.fontSize(fontSizeBody);
            doc.fillColor('black');

            const parseAndRenderLine = (line, x, y, isFirstLine = false) => {
                let currentX = x + (isFirstLine ? 35 : 0);
                let currentY = y;

                // Bold specific headers automatically
                if (line.match(/^(AS LOJA|A\/C\.:|Ref\.:|Atenciosamente,)/i)) {
                    doc.font('Helvetica-Bold');
                }

                const parts = line.split(/(\*\*.*?\*\*)/g);

                parts.forEach(part => {
                    if (part.startsWith('**') && part.endsWith('**')) {
                        const content = part.slice(2, -2);
                        doc.font('Helvetica-Bold');
                        doc.text(content, currentX, currentY, { lineBreak: false });
                        currentX += doc.widthOfString(content);
                        doc.font('Helvetica');
                    } else {
                        doc.text(part, currentX, currentY, { lineBreak: false });
                        currentX += doc.widthOfString(part);
                    }
                });

                // Break line at the end
                doc.font('Helvetica'); // Reset
                doc.moveDown(compact ? 1 : 1.2);
            };

            const lines = text.split('\n');
            let hasInlineStamps = false;

            for (let line of lines) {
                if (!line || line.trim() === '') {
                    doc.moveDown(0.5);
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

                // Handle Inline Stamps
                let extraY = 0;
                if (line.includes('{{CARIMBO_1}}') || line.includes('{{CARIMBO_2}}')) {
                    hasInlineStamps = true;
                    if (line.includes('{{CARIMBO_1}}') && carimbo1Buffer) {
                        const idx = line.indexOf('{{CARIMBO_1}}');
                        const prefix = line.substring(0, idx).replace(/\*\*/g, '');
                        const prefixWidth = doc.widthOfString(prefix);
                        doc.image(carimbo1Buffer, marginVal + prefixWidth, doc.y - 10, { width: 120, height: 60 });
                        line = line.replace('{{CARIMBO_1}}', '          ');
                        extraY = 50;
                    }
                    if (line.includes('{{CARIMBO_2}}') && carimbo2Buffer) {
                        const idx = line.indexOf('{{CARIMBO_2}}');
                        const prefix = line.substring(0, idx).replace(/\*\*/g, '');
                        const prefixWidth = doc.widthOfString(prefix);
                        doc.image(carimbo2Buffer, marginVal + prefixWidth, doc.y - 10, { width: 120, height: 60 });
                        line = line.replace('{{CARIMBO_2}}', '          ');
                        extraY = 50;
                    }
                }

                // Detect if it's a paragraph (starts with indentation in many styles)
                // Here we apply 35pt indentation to lines that follow an empty line or are start of block
                const isFirstLineOfParagraph = line.length > 50;

                parseAndRenderLine(line, marginVal, doc.y, isFirstLineOfParagraph);

                if (extraY > 0) doc.y += extraY;
            }

            // Footer / Stamps handling (if not inline)
            if (!hasInlineStamps) {
                let posY = doc.y + 20;
                const carimboHeight = 90;
                const carimboWidth = 170;
                const pageWidth = doc.page.width;

                if (posY > doc.page.height - 200) {
                    doc.addPage();
                    posY = 50;
                }

                let posX1 = marginVal;
                let posX2 = pageWidth - marginVal - carimboWidth;

                if (carimbo1Buffer && (stampPosition === 'ambos' || stampPosition === 'esquerda')) {
                    doc.image(carimbo1Buffer, posX1, posY, { fit: [carimboWidth, carimboHeight] });
                }
                if (carimbo2Buffer && (stampPosition === 'ambos' || stampPosition === 'direita')) {
                    const targetX = stampPosition === 'direita' ? (pageWidth - marginVal - carimboWidth) : posX2;
                    doc.image(carimbo2Buffer, targetX, posY, { fit: [carimboWidth, carimboHeight] });
                }
                posY += carimboHeight;
            }

            // Decor line
            doc.strokeColor('#eeeeee').lineWidth(0.5)
                .moveTo(marginVal, doc.page.height - 40)
                .lineTo(doc.page.width - marginVal, doc.page.height - 40)
                .stroke();

            doc.end();
        } catch (error) {
            console.error('[PDFGen] Fatal Error:', error);
            reject(error);
        }
    });
}

module.exports = { generateSaaSPDF };
