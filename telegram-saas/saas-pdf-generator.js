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

    const marginVal = compact ? 30 : 72;
    const fontSizeBody = compact ? 8.5 : 12;
    const lineGap = compact ? -0.5 : 2;
    const startY = compact ? 80 : 140;

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

            // Logo
            console.log(`[PDFGen] Logo buffer: ${logoBuffer ? logoBuffer.length : 'null'}`);
            if (logoBuffer) {
                try {
                    doc.image(logoBuffer, marginVal, 40, { width: 120 });
                    console.log(`[PDFGen] Logo inserida.`);
                } catch (e) {
                    console.error(`[PDFGen] Erro ao inserir logo:`, e.message);
                }
            }

            // Data
            doc.save();
            const currentDate = new Date().toLocaleDateString('pt-BR');
            doc.fontSize(10).fillColor('black')
                .text(currentDate, doc.page.width - 150, 40, {
                    width: 100,
                    align: 'right',
                    lineBreak: false
                });
            doc.restore();

            doc.x = marginVal;
            doc.y = startY;

            doc.font('Helvetica');
            doc.fontSize(fontSizeBody);
            doc.fillColor('black');

            console.log(`[PDFGen] Texto a ser escrito (primeiros 100 chars): "${text.substring(0, 100).replace(/\n/g, ' ')}..."`);

            // Texto
            const lines = text.split('\n');
            for (const line of lines) {
                if (!line || line.trim() === '') {
                    doc.moveDown(0.5);
                    continue;
                }

                if (line.trim().startsWith('#')) {
                    doc.fontSize(14).font('Helvetica-Bold')
                        .text(line.replace(/^#+\s*/, ''), { align: 'left' })
                        .moveDown(0.5);
                    doc.fontSize(12).font('Helvetica');
                    continue;
                }

                doc.text(line, { align: 'justify', lineGap: lineGap });
            }

            // --- Gerenciamento de Carimbos ---
            const carimboHeight = 90;
            const carimboWidth = 170;
            const margin = marginVal;
            const pageWidth = doc.page.width;

            let posX1 = margin;
            let posX2 = pageWidth - margin - carimboWidth;
            let posY = doc.page.height - 180; // Padrão

            // Sobrescrever se for personalizado
            if (stampPosition === 'personalizado' && customCoords) {
                posX1 = Number(customCoords.x) || margin;
                posY = Number(customCoords.y) || posY;
                posX2 = posX1 + carimboWidth + 20;
            } else {
                // Se não houver espaço na página atual:
                const bottomMargin = compact ? 100 : 200;

                if (doc.y > doc.page.height - bottomMargin) {
                    if (!compact) {
                        doc.addPage();
                        posY = 72;
                    } else {
                        // Compacto: Tenta usar o que tem mesmo que fique apertado
                        posY = doc.y + 5;
                        if (posY > 810) { // Limite absoluto A4 ~840
                            doc.addPage();
                            posY = 30;
                        }
                    }
                } else {
                    // Posicionamento
                    if (compact) {
                        // No modo compacto, COLA logo após o texto, não empurra pro final
                        posY = doc.y + 10;
                    } else {
                        posY = doc.page.height - 180;
                    }
                }
            }

            console.log(`[PDFGen] Modo: ${stampPosition}, Pos: X=${posX1}, Y=${posY}`);

            if (carimbo1Buffer && (stampPosition === 'ambos' || stampPosition === 'esquerda' || stampPosition === 'personalizado')) {
                doc.image(carimbo1Buffer, posX1, posY, { fit: [carimboWidth, carimboHeight] });
                console.log(`[PDFGen] Carimbo 1 inserido em X=${posX1}, Y=${posY}`);
            }
            if (carimbo2Buffer && (stampPosition === 'ambos' || stampPosition === 'direita')) {
                const targetX = stampPosition === 'direita' ? (pageWidth - margin - carimboWidth) : posX2;
                doc.image(carimbo2Buffer, targetX, posY, { fit: [carimboWidth, carimboHeight] });
                console.log(`[PDFGen] Carimbo 2 inserido em X=${targetX}, Y=${posY}`);
            }

            // Linha final decorativa
            const lineY = posY + carimboHeight + 10;
            doc.strokeColor('#dddddd').lineWidth(0.5)
                .moveTo(margin, lineY)
                .lineTo(pageWidth - margin, lineY)
                .stroke();

            doc.end();
        } catch (error) {
            reject(error);
        }
    });
}

module.exports = { generateSaaSPDF };
