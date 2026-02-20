const PDFDocument = require('pdfkit');
const axios = require('axios');

/**
 * Downloads an image from a URL and returns as a Buffer
 */
async function downloadImage(urlOrBuffer) {
    if (!urlOrBuffer) return null;
    if (Buffer.isBuffer(urlOrBuffer)) return urlOrBuffer;
    try {
        const response = await axios.get(urlOrBuffer, { responseType: 'arraybuffer', timeout: 8000 });
        return Buffer.from(response.data);
    } catch (e) {
        console.error(`❌ Erro ao baixar imagem: ${urlOrBuffer}`, e.message);
        return null;
    }
}

/**
 * Gera um PDF profissional a partir do texto da carta e imagens.
 * ABSOLUTAMENTE focado em UMA ÚNICA PÁGINA com carimbos INLINE.
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

            const marginH = 65;
            const marginV = 25;
            const pageWidth = doc.page.width;
            const pageHeight = doc.page.height;
            const textWidth = pageWidth - (marginH * 2);

            // Separate Footer Address
            let footerText = "";
            let bodyText = text.replace(/\*\*\{\{CARIMBO_1\}\}\*\*/g, '{{CARIMBO_1}}')
                .replace(/\*\*\{\{CARIMBO_2\}\}\*\*/g, '{{CARIMBO_2}}');

            const lines = bodyText.split('\n');
            const processedLines = [];
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                if (line.match(/(Rua Demóstenes|CEP 04614-013|São Paulo - SP|Terceirização)/i) && i > lines.length - 8) {
                    footerText = line;
                } else {
                    processedLines.push(lines[i]);
                }
            }

            // --- SCALE LOGIC ---
            let fontSize = 11.5;
            let lineGap = 1.0;
            const startY = 120;
            const footerY = pageHeight - 40;
            const carHeight = 85;
            const carWidth = 155;

            // Estimate total height including stamps
            const estimateHeight = (fs, lg) => {
                let currentY = 0;
                processedLines.forEach(line => {
                    const trimmed = line.trim();
                    if (trimmed === '') {
                        currentY += (fs * 0.4);
                    } else if (trimmed.includes('{{CARIMBO_1}}') || trimmed.includes('{{CARIMBO_2}}')) {
                        currentY += carHeight + 5;
                    } else {
                        const h = doc.fontSize(fs).heightOfString(trimmed, {
                            width: textWidth,
                            align: 'justify',
                            lineGap: lg,
                            indent: (trimmed.length > 50 && !trimmed.match(/^(AS LOJA|A\/C\.:|Ref\.:|Atenciosamente,)/i)) ? 35 : 0
                        });
                        currentY += h + 1.5;
                    }
                });
                return currentY;
            };

            let totalEst = estimateHeight(fontSize, lineGap);
            const availableHeight = footerY - startY - 20;

            while (totalEst > availableHeight && fontSize > 8.5) {
                fontSize -= 0.5;
                lineGap -= 0.2;
                if (lineGap < -1.5) lineGap = -1.5;
                totalEst = estimateHeight(fontSize, lineGap);
            }

            // --- RENDERING ---
            // Logo
            if (logoBuffer) {
                try { doc.image(logoBuffer, marginH, 30, { width: 110 }); } catch (e) { }
            }
            // Date
            const months = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
            const now = new Date();
            const dateStr = `Data de emissão: ${now.getDate()} DE ${months[now.getMonth()]} DE ${now.getFullYear()}`;
            doc.font('Helvetica-Bold').fontSize(9).text(dateStr, marginH, 45, { align: 'right' });

            doc.y = startY;
            doc.fontSize(fontSize).font('Helvetica');

            let renderedCar1 = false;
            let renderedCar2 = false;

            processedLines.forEach(line => {
                const trimmed = line.trim();
                if (trimmed === '') {
                    doc.moveDown(0.3);
                    return;
                }

                // Placeholders INLINE
                if (trimmed.includes('{{CARIMBO_1}}') || trimmed.includes('{{CARIMBO_2}}')) {
                    const y = doc.y;
                    if (trimmed.includes('{{CARIMBO_1}}') && carimbo1Buffer) {
                        doc.image(carimbo1Buffer, marginH, y, { fit: [carWidth, carHeight] });
                        renderedCar1 = true;
                    }
                    if (trimmed.includes('{{CARIMBO_2}}') && carimbo2Buffer) {
                        const x = trimmed.includes('{{CARIMBO_1}}') ? (pageWidth - marginH - carWidth) : marginH;
                        doc.image(carimbo2Buffer, x, y, { fit: [carWidth, carHeight] });
                        renderedCar2 = true;
                    }
                    doc.y += carHeight + 5;
                    return;
                }

                if (trimmed.startsWith('#')) {
                    doc.font('Helvetica-Bold').fontSize(fontSize + 1)
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
                doc.moveDown(0.2);
            });

            // FALLBACK: If stamps weren't in placeholders, put them at bottom
            if ((!renderedCar1 && carimbo1Buffer) || (!renderedCar2 && carimbo2Buffer)) {
                let y = Math.max(doc.y + 20, footerY - carHeight - 15);
                if (!renderedCar1 && carimbo1Buffer) {
                    doc.image(carimbo1Buffer, marginH, y, { fit: [carWidth, carHeight] });
                }
                if (!renderedCar2 && carimbo2Buffer) {
                    doc.image(carimbo2Buffer, pageWidth - marginH - carWidth, y, { fit: [carWidth, carHeight] });
                }
            }

            // Footer
            if (footerText) {
                if (doc.bufferedPageCount > 1) doc.switchToPage(0);
                doc.fontSize(8).fillColor('gray').font('Helvetica');
                doc.text(footerText, marginH, footerY, {
                    align: 'center',
                    width: pageWidth - (marginH * 2)
                });
            }

            doc.end();
        } catch (error) {
            console.error('[PDFGen] Erro:', error);
            reject(error);
        }
    });
}

module.exports = { generateSaaSPDF };
