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
 * Focado em manter TUDO em uma única página (A4).
 */
async function generateSaaSPDF({ text, logoUrl, carimbo1Url, carimbo2Url, stampPosition = 'ambos', customCoords = null, compact = false }) {
    const logoBuffer = await downloadImage(logoUrl);
    const carimbo1Buffer = await downloadImage(carimbo1Url);
    const carimbo2Buffer = await downloadImage(carimbo2Url);

    // Configurações de layout agressivas para página única
    const marginH = 65; // Margens laterais fixas
    const marginV = 35; // Margem superior/inferior reduzida
    let fontSizeBody = 11.5; // Fonte base
    let lineGap = 1.2;

    // Se o texto for muito longo, reduzimos automaticamente para caber
    const charCount = text.length;
    if (charCount > 2200) {
        fontSizeBody = 10;
        lineGap = 0.5;
    } else if (charCount > 1800) {
        fontSizeBody = 11;
        lineGap = 0.8;
    }

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

            // --- 1. LIMPEZA DE TEXTO ---
            let cleanText = text
                .replace(/\*\*\{\{CARIMBO_1\}\}\*\*/g, '')
                .replace(/\*\*\{\{CARIMBO_2\}\}\*\*/g, '')
                .replace(/\{\{CARIMBO_1\}\}/g, '')
                .replace(/\{\{CARIMBO_2\}\}/g, '')
                .trim();

            const rawLines = cleanText.split('\n');
            let bodyLines = [];
            let footerText = "";

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
                    doc.image(logoBuffer, marginH, 35, { width: 115 });
                } catch (e) { console.error(e); }
            }

            const months = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
            const now = new Date();
            const dateStr = `Data de emissão: ${now.getDate()} DE ${months[now.getMonth()]} DE ${now.getFullYear()}`;

            doc.font('Helvetica-Bold').fontSize(9).fillColor('black');
            doc.text(dateStr, marginH, 50, { align: 'right' });

            doc.y = 130; // Início do corpo
            doc.fontSize(fontSizeBody).font('Helvetica').fillColor('black');

            // --- 3. CORPO (RENDERIZAÇÃO) ---
            bodyLines.forEach((line) => {
                const trimmed = line.trim();
                if (trimmed === '') {
                    doc.moveDown(0.3);
                    return;
                }

                if (trimmed.startsWith('#')) {
                    doc.font('Helvetica-Bold').fontSize(fontSizeBody + 1)
                        .text(trimmed.replace(/^#+\s*/, ''), { align: 'left' })
                        .moveDown(0.2);
                    doc.font('Helvetica').fontSize(fontSizeBody);
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

            // --- 4. CARIMBOS (FORÇADOS NA PRIMEIRA PÁGINA) ---
            // Se o texto empurrou para a segunda página, tentamos "voltar" para a primeira
            // ou garantir que fiquem no final da primeira
            const carWidth = 155;
            const carHeight = 85;
            let posY = Math.min(doc.y + 25, doc.page.height - 180);

            // Se o conteúdo real excedeu a página, os carimbos vão para o final da página 1 obrigatoriamente
            if (doc.bufferedPageCount > 1) {
                doc.switchToPage(0);
                posY = doc.page.height - 190;
            }

            if (carimbo1Buffer) {
                doc.image(carimbo1Buffer, marginH, posY, { fit: [carWidth, carHeight] });
            }
            if (carimbo2Buffer) {
                const tx = doc.page.width - marginH - carWidth;
                doc.image(carimbo2Buffer, tx, posY, { fit: [carWidth, carHeight] });
            }

            // --- 5. RODAPÉ FIXO (PÁGINA 1) ---
            if (footerText) {
                doc.switchToPage(0);
                doc.fontSize(8).fillColor('gray').font('Helvetica');
                doc.text(footerText, marginH, doc.page.height - 40, {
                    align: 'center',
                    width: doc.page.width - (marginH * 2)
                });
            }

            // Se criamos uma segunda página acidentalmente, tentamos ignorá-la ou mantemos apenas a 1
            doc.end();
        } catch (error) {
            console.error('[PDFGen] Erro:', error);
            reject(error);
        }
    });
}

module.exports = { generateSaaSPDF };
