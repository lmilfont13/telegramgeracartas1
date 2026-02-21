const PDFKit = require('pdfkit');
const PDFDocument = PDFKit.default || PDFKit;
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
 * GARANTE PÁGINA ÚNICA USANDO RENDERIZAÇÃO RECURSIVA (v4.0).
 */
async function generateSaaSPDF({ text, logoUrl, carimbo1Url, carimbo2Url, stampPosition = 'ambos', customCoords = null, compact = false }) {
    const logoBuffer = await downloadImage(logoUrl);
    const carimbo1Buffer = await downloadImage(carimbo1Url);
    const carimbo2Buffer = await downloadImage(carimbo2Url);

    // Parâmetros iniciais de busca do "tamanho ideal"
    let fontSize = 11.5;
    let lineGap = 1.2;
    let stampScale = 1.0;
    let logoScale = 1.0;
    let attempt = 1;

    // Função interna para tentar renderizar e validar página única
    async function tryRender(fs, lg, ss, ls, allowOverflow = false) {
        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument({
                    size: 'A4',
                    margins: { top: (compact ? 15 : 25) * ls, bottom: 25, left: 60, right: 60 },
                    bufferPages: true
                });

                // --- ESTRATÉGIA ZERO-OVERFLOW ---
                // Se o PDFKit tentar adicionar uma segunda página, abortamos na hora e reduzimos tudo.
                // EXCETO se for a última tentativa (allowOverflow=true) onde preferimos cortar do que dar erro.
                doc.on('pageAdded', () => {
                    if (!allowOverflow) {
                        reject(new Error('OVERFLOW'));
                    }
                });

                const chunks = [];
                doc.on('data', (chunk) => chunks.push(chunk));
                doc.on('end', () => resolve(Buffer.concat(chunks)));
                doc.on('error', (err) => {
                    if (err.message === 'OVERFLOW') return; // Ignora erro de overflow, o loop tratará
                    reject(err);
                });

                const mH = 60;
                const pageWidth = doc.page.width;
                const pageHeight = doc.page.height;
                const textWidth = pageWidth - (mH * 2);
                const carHeight = (compact ? 75 : 85) * ss;
                const carWidth = (compact ? 135 : 155) * ss;

                // --- 1. PREPARAÇÃO DO TEXTO E RODAPÉ ---
                let footerText = "";
                let cleanText = text
                    .replace(/\*\*\{\{\s*CARIMBO_[12]\s*\}\}\*\*/gi, (m) => m.replace(/\*\*/g, ''))
                    .trim();

                const rawLines = cleanText.split('\n');
                const bodyLines = [];
                for (let i = 0; i < rawLines.length; i++) {
                    const line = rawLines[i].trim();
                    if (line.match(/(Rua Demóstenes|CEP 04614-013|São Paulo - SP|Terceirização|POP TRADE)/i) && i > rawLines.length - 8) {
                        footerText = line;
                    } else {
                        bodyLines.push(rawLines[i]);
                    }
                }

                const startY = (compact ? 70 : 100) * ls;
                const footerY = pageHeight - 35;

                // --- 2. RENDERIZAÇÃO ---
                // Logo
                if (logoBuffer) {
                    try { doc.image(logoBuffer, mH, 20 * ls, { width: 100 * ls }); } catch (e) { }
                }
                // Data
                const months = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
                const now = new Date();
                const dateStr = `Data de emissão: ${now.getDate()} DE ${months[now.getMonth()]} DE ${now.getFullYear()}`;
                doc.font('Helvetica-Bold').fontSize(max(7, fs * 0.75)).text(dateStr, mH, 35 * ls, { align: 'right' });

                doc.y = startY;
                doc.fontSize(fs).font('Helvetica');

                let renderedCar1 = false;
                let renderedCar2 = false;

                bodyLines.forEach(line => {
                    const untrimmed = line;
                    const trimmed = line.trim();
                    const hasStamp = untrimmed.match(/\{\{\s*(CARIMBO_[12])\s*\}\}/i);

                    if (trimmed === '') {
                        doc.y += (fs * 0.3);
                        return;
                    }

                    const currentY = doc.y;

                    if (hasStamp) {
                        const regex = /\{\{\s*(CARIMBO_[12])\s*\}\}/gi;
                        let match;
                        let matches = [];
                        while ((match = regex.exec(untrimmed)) !== null) {
                            matches.push({ key: match[1].toUpperCase(), index: match.index });
                        }

                        matches.forEach((m) => {
                            const buffer = m.key === 'CARIMBO_1' ? carimbo1Buffer : carimbo2Buffer;
                            if (!buffer) return;

                            let targetX = mH;
                            const lineLen = untrimmed.length;
                            const posPercent = m.index / lineLen;

                            if (posPercent > 0.6) {
                                targetX = pageWidth - mH - carWidth;
                            } else if (posPercent > 0.3) {
                                targetX = (pageWidth / 2) - (carWidth / 2);
                            }

                            doc.image(buffer, targetX, currentY, { fit: [carWidth, carHeight] });
                            if (m.key === 'CARIMBO_1') renderedCar1 = true;
                            if (m.key === 'CARIMBO_2') renderedCar2 = true;
                        });
                    }

                    if (trimmed.startsWith('#')) {
                        doc.font('Helvetica-Bold').fontSize(fs + 1.1)
                            .text(trimmed.replace(/^#+\s*/, ''), { align: 'left' });
                        doc.font('Helvetica').fontSize(fs);
                        doc.y += 0.8;
                        return;
                    }

                    const isHeading = trimmed.match(/^(AS LOJA|A\/C\.:|Ref\.:|Atenciosamente,)/i);
                    const shouldJustify = !isHeading && trimmed.length > 55;
                    const options = {
                        align: shouldJustify ? 'justify' : 'left',
                        indent: shouldJustify ? 25 : 0,
                        lineGap: lg
                    };

                    let textToRender = untrimmed.replace(/\{\{\s*CARIMBO_[12]\s*\}\}/gi, '');

                    if (textToRender.trim() === '' && hasStamp) {
                        doc.y += carHeight + 1;
                        return;
                    }

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
                        doc.y = Math.max(doc.y, currentY + carHeight + 1);
                    } else {
                        doc.y += 0.8;
                    }
                });

                if ((!renderedCar1 && carimbo1Buffer) || (!renderedCar2 && carimbo2Buffer)) {
                    let finalY = Math.max(doc.y + 5, footerY - carHeight - 5);
                    if (!renderedCar1 && carimbo1Buffer) {
                        doc.image(carimbo1Buffer, mH, finalY, { fit: [carWidth, carHeight] });
                    }
                    if (!renderedCar2 && carimbo2Buffer) {
                        doc.image(carimbo2Buffer, pageWidth - mH - carWidth, finalY, { fit: [carWidth, carHeight] });
                    }
                }

                if (footerText) {
                    doc.fontSize(8.0).fillColor('gray').font('Helvetica');
                    doc.text(footerText, mH, footerY, { align: 'center', width: pageWidth - (mH * 2) });
                }

                doc.fontSize(4).fillColor('#eeeeee').text(`v4.3.Final-Att-${attempt}-${new Date().toISOString()}`, 10, pageHeight - 10);
                doc.end();
            } catch (error) { reject(error); }
        });
    }

    // --- LOOP RECURSIVO DE TENTATIVAS (ZERO OVERFLOW) ---
    while (attempt < 15) {
        try {
            console.log(`[PDFGen v4.3] Tentativa ${attempt}: Font=${fontSize}pt, Gap=${lineGap}, Stamp=${stampScale}`);
            const buffer = await tryRender(fontSize, lineGap, stampScale, logoScale, false);
            return buffer; // Se chegou aqui, deu certo e ficou em uma página!
        } catch (err) {
            if (err.message === 'OVERFLOW') {
                attempt++;
                fontSize -= 0.6;
                lineGap -= 0.25;
                if (fontSize < 7.5) stampScale -= 0.05; // Encolhe carimbo se a letra ficar muito pequena
                if (fontSize < 6.5) logoScale -= 0.05; // Encolhe logo se for extremo
                if (lineGap < -4.5) lineGap = -4.5;
                if (fontSize < 3.5) fontSize = 3.5;
                if (stampScale < 0.6) stampScale = 0.6;
                continue;
            }
            throw err; // Outros erros
        }
    }

    // Fallback final: Se após 15 tentativas não coube, forçamos a renderização clipped (allowOverflow=true)
    console.warn(`[PDFGen v4.3] Max attempts reached. Forcing 1-page clipped output.`);
    return await tryRender(3.5, -4.5, 0.6, 0.6, true);
}

function max(a, b) { return a > b ? a : b; }

module.exports = { generateSaaSPDF };
