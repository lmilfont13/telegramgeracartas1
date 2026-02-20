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
 * ABSOLUTAMENTE focado em UMA ÚNICA PÁGINA.
 */
async function generateSaaSPDF({ text, logoUrl, carimbo1Url, carimbo2Url, stampPosition = 'ambos', customCoords = null, compact = false }) {
    const logoBuffer = await downloadImage(logoUrl);
    const carimbo1Buffer = await downloadImage(carimbo1Url);
    const carimbo2Buffer = await downloadImage(carimbo2Url);

    return new Promise((resolve, reject) => {
        try {
            // Criamos o documento com buffer de páginas para poder voltar se necessário,
            // mas o objetivo é nunca criar a segunda página.
            const doc = new PDFDocument({
                size: 'A4',
                margins: { top: 30, bottom: 30, left: 60, right: 60 },
                bufferPages: true
            });

            const chunks = [];
            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            const marginH = 65;
            const marginV = 30;
            const pageWidth = doc.page.width;
            const pageHeight = doc.page.height;
            const textWidth = pageWidth - (marginH * 2);

            // --- 1. LIMPEZA E PREPARAÇÃO ---
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
                // Identifica se é o rodapé de endereço
                if (line.match(/(Rua Demóstenes|CEP 04614-013|São Paulo - SP|Terceirização)/i) && i > rawLines.length - 8) {
                    footerText = line;
                } else {
                    bodyLines.push(rawLines[i]);
                }
            }

            // --- 2. CÁLCULO DE ESPAÇO DISPONÍVEL ---
            const startY = 125;
            const stampsHeight = 90;
            const footerSpace = 50;
            const maxTextHeight = pageHeight - startY - stampsHeight - footerSpace - 10;

            // Lógica de Escalonamento Dinâmico
            let fontSize = 11.5;
            let lineGap = 1.2;

            // Função para estimar altura total
            const estimateHeight = (fs, lg) => {
                let currentY = 0;
                bodyLines.forEach(line => {
                    const trimmed = line.trim();
                    if (trimmed === '') {
                        currentY += (fs * 0.5);
                    } else {
                        const h = doc.fontSize(fs).heightOfString(trimmed, {
                            width: textWidth,
                            align: 'justify',
                            lineGap: lg,
                            indent: (trimmed.length > 50 && !trimmed.match(/^(AS LOJA|A\/C\.:|Ref\.:|Atenciosamente,)/i)) ? 35 : 0
                        });
                        currentY += h + 2; // +2 de margem entre parágrafos
                    }
                });
                return currentY;
            };

            // Ajusta fonte se necessário para caber em uma página
            let estimatedHeight = estimateHeight(fontSize, lineGap);
            while (estimatedHeight > maxTextHeight && fontSize > 8) {
                fontSize -= 0.5;
                lineGap -= 0.2;
                if (lineGap < -1) lineGap = -1;
                estimatedHeight = estimateHeight(fontSize, lineGap);
            }

            // --- 3. RENDERIZAÇÃO ---
            // Logo
            if (logoBuffer) {
                try {
                    doc.image(logoBuffer, marginH, 30, { width: 110 });
                } catch (e) { }
            }

            // Data
            const months = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
            const now = new Date();
            const dateStr = `Data de emissão: ${now.getDate()} DE ${months[now.getMonth()]} DE ${now.getFullYear()}`;
            doc.font('Helvetica-Bold').fontSize(9).text(dateStr, marginH, 45, { align: 'right' });

            // Inicia Texto
            doc.y = startY;
            doc.fontSize(fontSize).font('Helvetica');

            bodyLines.forEach(line => {
                const trimmed = line.trim();
                if (trimmed === '') {
                    doc.moveDown(0.3);
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

            // --- 4. CARIMBOS E RODAPÉ ---
            // Garantimos que os carimbos fiquem SEMPRE NO FINAL DA PÁGINA 1
            // Se o PDFKit criou uma segunda página, nós a "removemos" via switchToPage
            // embora ela tecnicamente ainda esteja no buffer, o que importa é o que desenhamos.
            // Mas para garantir real 1 página, vamos forçar doc.y se ele ainda estiver na pag 1.

            doc.switchToPage(0); // Volta para a 1 se ele criou a 2

            const carWidth = 155;
            const carHeight = 85;
            const posY = pageHeight - marginV - stampsHeight - 15;

            if (carimbo1Buffer) {
                doc.image(carimbo1Buffer, marginH, posY, { fit: [carWidth, carHeight] });
            }
            if (carimbo2Buffer) {
                const tx = pageWidth - marginH - carWidth;
                doc.image(carimbo2Buffer, tx, posY, { fit: [carWidth, carHeight] });
            }

            if (footerText) {
                doc.fontSize(8).fillColor('gray').font('Helvetica');
                doc.text(footerText, marginH, pageHeight - 35, {
                    align: 'center',
                    width: pageWidth - (marginH * 2)
                });
            }

            // TRUQUE FINAL: Se houver mais de uma página, tentamos "truncar" as páginas extras.
            // Infelizmente o PDFKit não permite deletar páginas, então o segredo é o loop de scaling acima.

            doc.end();
        } catch (error) {
            console.error('[PDFGen] Erro:', error);
            reject(error);
        }
    });
}

module.exports = { generateSaaSPDF };
