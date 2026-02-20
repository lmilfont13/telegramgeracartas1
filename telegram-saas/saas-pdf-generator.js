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

            // Data - Right Aligned
            const months = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
            const now = new Date();
            const dateStr = `Data de emissão: ${now.getDate()} DE ${months[now.getMonth()]} DE ${now.getFullYear()}`;

            doc.save();
            doc.font('Helvetica-Bold').fontSize(9).fillColor('black');
            doc.text(dateStr, marginVal, 60, {
                align: 'right'
            });
            doc.restore();

            doc.x = marginVal;
            doc.y = startY;

            doc.font('Helvetica');
            doc.fontSize(fontSizeBody);
            doc.fillColor('black');

            /**
             * Renders a line with bold support (**text**) while maintaining word wrap.
             */
            const renderRichText = (line, options = {}) => {
                const parts = line.split(/(\*\*.*?\*\*)/g);

                // Bold specific lines automatically
                if (line.match(/^(AS LOJA|A\/C\.:|Ref\.:|Atenciosamente,)/i)) {
                    doc.font('Helvetica-Bold');
                }

                parts.forEach((part, index) => {
                    const isLast = index === parts.length - 1;
                    const combinedOptions = { ...options, continued: !isLast };

                    if (part.startsWith('**') && part.endsWith('**')) {
                        const content = part.slice(2, -2);
                        doc.font('Helvetica-Bold').text(content, combinedOptions);
                    } else if (part !== '') {
                        doc.font('Helvetica').text(part, combinedOptions);
                    } else if (isLast && part === '') {
                        // End flow
                        doc.text('', options);
                    }
                });

                doc.font('Helvetica'); // Reset
            };

            const lines = text.split('\n');
            let hasInlineStamps = false;
            let footerText = '';

            for (let line of lines) {
                if (!line || line.trim() === '') {
                    doc.moveDown(0.5);
                    continue;
                }

                // Detect address lines to move to footer
                if (line.match(/(Rua|CEP|Campo Belo|São Paulo - SP|Terceirização)/i) && line.length > 25) {
                    footerText = line;
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

                // Apply indentation for long lines
                const textOptions = {
                    align: 'justify',
                    indent: line.length > 60 ? 30 : 0,
                    lineGap: compact ? -1.5 : 2
                };

                renderRichText(line, textOptions);
                if (extraY > 0) doc.y += extraY;
            }

            // Footer / Stamps handling
            if (!hasInlineStamps) {
                let posY = doc.y + 30;
                const carimboHeight = 90;
                const carimboWidth = 170;
                const pageWidth = doc.page.width;

                if (posY > doc.page.height - 200) {
                    doc.addPage();
                    posY = marginVal;
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
            }

            // --- FIXED FOOTER (ADDRESS) ---
            if (footerText) {
                const footerY = doc.page.height - 60;
                doc.fontSize(8).font('Helvetica').fillColor('gray');
                doc.text(footerText, marginVal, footerY, {
                    align: 'center',
                    width: doc.page.width - (marginVal * 2)
                });
            }

            doc.end();
        } catch (error) {
            console.error('[PDFGen] Fatal Error:', error);
            reject(error);
        }
    });
}

module.exports = { generateSaaSPDF };
