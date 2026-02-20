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

    // Ajuste de margens para garantir que caiba em uma página
    const marginV = compact ? 20 : 60;
    const marginH = compact ? 25 : 72;
    const fontSizeBody = compact ? 9.5 : 12; // Aumentado um pouco para legibilidade
    const startY = compact ? 80 : 140;

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

            // --- CABEÇALHO (LOGO E DATA) ---
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
            // Divide o texto mas preserva os parágrafos para a justificação
            const rawLines = text.split('\n');
            let footerCandidate = "";

            // Filtra o rodapé (última linha que parece endereço)
            const bodyLines = [];
            for (let i = 0; i < rawLines.length; i++) {
                const line = rawLines[i].trim();
                // Se a linha for o endereço (Rua Demostenes etc), salva para o footer
                if (line.match(/(Rua Demóstenes|CEP 04614-013|São Paulo - SP)/i)) {
                    footerCandidate = line;
                } else {
                    bodyLines.push(rawLines[i]);
                }
            }

            // Renderização das linhas do corpo
            for (let line of bodyLines) {
                if (line.trim() === '') {
                    doc.moveDown(0.5);
                    continue;
                }

                // Header automático (#)
                if (line.trim().startsWith('#')) {
                    doc.font('Helvetica-Bold').fontSize(fontSizeBody + 2)
                        .text(line.replace(/^#+\s*/, ''), { align: 'left' })
                        .moveDown(0.2);
                    doc.font('Helvetica').fontSize(fontSizeBody);
                    continue;
                }

                // Opções de texto (Justificado e Indentado)
                const options = {
                    align: 'justify',
                    indent: (line.length > 40 && !line.includes(':')) ? 35 : 0,
                    lineGap: compact ? -1 : 1.5
                };

                // Suporte a Negrito Inline (**texto**)
                const parts = line.split(/(\*\*.*?\*\*)/g);

                // Bold automático para linhas de cabeçalho comuns
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

                // Detecção de Carimbos Inseridos no Texto
                if (line.includes('{{CARIMBO_1}}') || line.includes('{{CARIMBO_2}}')) {
                    // Se houver placeholders de carimbo na linha, o doc.y já avançou
                    // Precisamos garantir espaço para eles se não renderizados ainda
                    doc.moveDown(4);
                }
            }

            // --- CARIMBOS NO FINAL ---
            let posY = doc.y + 20;
            const carWidth = 160;
            const carHeight = 80;

            // Garante que carimbos caibam na página ou cria nova
            if (posY > doc.page.height - 180) {
                // Se estiver quase no fim, espreme um pouco
                if (posY > doc.page.height - 120) {
                    doc.addPage();
                    posY = marginV + 20;
                }
            }

            if (carimbo1Buffer && (stampPosition === 'esquerda' || stampPosition === 'ambos')) {
                doc.image(carimbo1Buffer, marginH, posY, { fit: [carWidth, carHeight] });
            }
            if (carimbo2Buffer && (stampPosition === 'direita' || stampPosition === 'ambos')) {
                const targetX = doc.page.width - marginH - carWidth;
                doc.image(carimbo2Buffer, targetX, posY, { fit: [carWidth, carHeight] });
            }

            // --- RODAPÉ FIXO (ENDEREÇO) ---
            if (footerCandidate) {
                const totalPages = doc.bufferedPageCount;
                doc.switchToPage(0); // Sempre na primeira página

                doc.fontSize(8).fillColor('gray').font('Helvetica');
                doc.text(footerCandidate, marginH, doc.page.height - 50, {
                    align: 'center',
                    width: doc.page.width - (marginH * 2)
                });

                doc.switchToPage(totalPages - 1);
            }

            doc.end();
        } catch (error) {
            console.error('[PDFGen] Erro Fatal:', error);
            reject(error);
        }
    });
}

module.exports = { generateSaaSPDF };
