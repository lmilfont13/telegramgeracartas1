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

            // Regex para INLINE é removido. Agora detectamos linha a linha para OVERLAY.
            let pendingStamps = [];

            // Variáveis comuns para o rodapé (definidas fora para evitar erro de escopo)
            const carimboHeight = 90;
            const carimboWidth = 170;
            const margin = marginVal;
            const pageWidth = doc.page.width;
            let posY = doc.page.height - 180; // Valor padrão para uso posterior

            // Configuração Compacta (Reaplicar para garantir)
            if (compact) {
                doc.fontSize(8);
                doc.fillColor('black');
            } else {
                doc.fontSize(12);
            }

            const lines = text.split('\n');
            for (let line of lines) {
                if (!line) { // Linha vazia ou null
                    if (compact) {
                        doc.y += 1.5;
                    } else {
                        doc.moveDown(0.5);
                    }
                    continue;
                }

                if (line.trim() === '') {
                    if (compact) doc.y += 1.5;
                    else doc.moveDown(0.5);
                    continue;
                }

                // --- DETECÇÃO E POSICIONAMENTO EXATO DOS CARIMBOS ---
                // Agora calculamos a posição X baseada no texto ANTES do placeholder.

                let extraY = 0; // Espaço extra a adicionar DEPOIS de imprimir a linha

                if (line.includes('{{CARIMBO_1}}')) {
                    hasInlineStamps = true;
                    if (carimbo1Buffer) {
                        try {
                            // Calcula X baseado no prefixo
                            const idx = line.indexOf('{{CARIMBO_1}}');
                            const prefix = line.substring(0, idx);
                            const prefixWidth = doc.widthOfString(prefix);
                            let xPos = margin + prefixWidth;

                            // Ajuste fino se o usuário usou espaços
                            console.log(`[PDFGen] Placeholder 1 encontrado. Prefix: "${prefix}", Width: ${prefixWidth}, X: ${xPos}`);

                            // Desenha o carimbo NA LINHA ATUAL (overlay)
                            doc.image(carimbo1Buffer, xPos, doc.y - 10, { width: 120, height: 60 });
                            // Nota: doc.y - 10 para subir um pouco e centralizar na linha de base

                            extraY = Math.max(extraY, 50); // Reserva espaço
                        } catch (e) {
                            console.error("Erro ao calcular posição do carimbo 1:", e);
                        }
                    }
                    // Remove o placeholder da string para imprimir o resto limpo
                    line = line.replace('{{CARIMBO_1}}', '          ');
                }

                if (line.includes('{{CARIMBO_2}}')) {
                    hasInlineStamps = true;
                    if (carimbo2Buffer) {
                        try {
                            const idx = line.indexOf('{{CARIMBO_2}}');
                            const prefix = line.substring(0, idx);
                            const prefixWidth = doc.widthOfString(prefix);
                            let xPos = margin + prefixWidth;

                            console.log(`[PDFGen] Placeholder 2 encontrado. Prefix: "${prefix}", Width: ${prefixWidth}, X: ${xPos}`);

                            doc.image(carimbo2Buffer, xPos, doc.y - 10, { width: 120, height: 60 });

                            extraY = Math.max(extraY, 50);
                        } catch (e) {
                            console.error("Erro ao calcular posição do carimbo 2:", e);
                        }
                    }
                    line = line.replace('{{CARIMBO_2}}', '          ');
                }

                // Renderiza o texto (agora limpo das tags, mas COM o conteúdo restante)
                if (line.trim().startsWith('#')) {
                    doc.fontSize(compact ? 9 : 14).font('Helvetica-Bold')
                        .text(line.replace(/^#+\s*/, ''), { align: 'left' })
                        .moveDown(0.2);
                    doc.fontSize(compact ? 8 : 12).font('Helvetica');
                    // Se tiver carimbo no título (raro), avança
                    if (extraY > 0) doc.y += extraY;
                    continue;
                }

                // Imprime a linha
                doc.text(line, { align: 'left', lineGap: compact ? -1.5 : 2 });

                // Avança o espaço reservado para os carimbos
                if (extraY > 0) {
                    doc.y += extraY;
                    posY = doc.y; // Atualiza rastreador
                }

                continue; // Já imprimimos a linha manualmente acima
            }
            // (Removemos o loop pendingStamps antigo aqui)

            // Atualiza posY baseada no final do texto
            posY = doc.y;

            // Se NÃO tiver carimbos inline, usa comportamento padrão de rodapé
            if (!hasInlineStamps) {
                let posX1 = margin;
                let posX2 = pageWidth - margin - carimboWidth;

                // Sobrescrever se for personalizado
                if (stampPosition === 'personalizado' && customCoords) {
                    posX1 = Number(customCoords.x) || margin;
                    posY = Number(customCoords.y) || posY;
                    posX2 = posX1 + carimboWidth + 20;
                } else {
                    // Se não houver espaço na página atual:
                    const bottomMargin = compact ? 50 : 200;

                    if (doc.y > doc.page.height - bottomMargin) {
                        if (!compact) {
                            doc.addPage();
                            posY = 72;
                        } else {
                            // Compacto Nuclear: Tenta usar até o último pixel
                            posY = doc.y + 2;
                            if (posY > 825) { // Limite absoluto A4 ~841
                                doc.addPage();
                                posY = 20;
                            }
                        }
                    } else {
                        // Posicionamento
                        if (compact) {
                            // Cola imediata com overlap se precisar
                            posY = doc.y + 5;
                        } else {
                            posY = doc.page.height - 180;
                        }
                    }
                }

                console.log(`[PDFGen] Modo Footer: ${stampPosition}, Pos: X1=${posX1}, Y=${posY}`);

                if (carimbo1Buffer && (stampPosition === 'ambos' || stampPosition === 'esquerda' || stampPosition === 'personalizado')) {
                    doc.image(carimbo1Buffer, posX1, posY, { fit: [carimboWidth, carimboHeight] });
                }
                if (carimbo2Buffer && (stampPosition === 'ambos' || stampPosition === 'direita')) {
                    const targetX = stampPosition === 'direita' ? (pageWidth - margin - carimboWidth) : posX2;
                    doc.image(carimbo2Buffer, targetX, posY, { fit: [carimboWidth, carimboHeight] });
                }

                // Ajusta posY para a linha final
                posY = posY + carimboHeight;
            } // Fim do check se não tem stamps pendentes


            // --- FORÇAR RODAPÉ NA MESMA PÁGINA (NUCLEAR) ---
            // Se posY passou do limite da página, CLAMPA ele para o finalzinho
            const maxPageY = doc.page.height - 40;
            if (posY > maxPageY) {
                console.log(`[PDFGen] PosY (${posY}) passou do limite (${maxPageY}). Forçando rodapé.`);
                posY = maxPageY;
                // Se o cursor do texto também passou, volta
                if (doc.y > maxPageY) doc.y = maxPageY - 10;
            }

            // Linha final decorativa
            const lineY = posY + 5; // Margem mínima
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
