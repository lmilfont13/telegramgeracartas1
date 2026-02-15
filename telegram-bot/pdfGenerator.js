const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Gera um PDF profissional a partir do texto da carta
 * @param {string} text - Texto completo da carta
 * @returns {Promise<Buffer>} - Buffer do PDF gerado
 */
async function generatePDF(text) {
    return new Promise((resolve, reject) => {
        try {
            // Criar documento PDF
            const doc = new PDFDocument({
                size: 'A4',
                margins: {
                    top: 72,    // ~2.5cm
                    bottom: 72,
                    left: 72,
                    right: 72
                },
                bufferPages: true
            });

            // Array para armazenar os chunks do PDF
            const chunks = [];

            // Coletar dados do PDF
            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            // Adicionar logo se existir
            const logoPath = path.join(__dirname, 'logo.png');
            const logoPathJpg = path.join(__dirname, 'logo.jpg');

            if (fs.existsSync(logoPath)) {
                doc.image(logoPath, 72, 40, { width: 120 });
            } else if (fs.existsSync(logoPathJpg)) {
                doc.image(logoPathJpg, 72, 40, { width: 120 });
            }

            // Adicionar data no canto superior direito (ISOLADO)
            doc.save(); // Salvar estado atual
            const currentDate = new Date().toLocaleDateString('pt-BR');
            doc.fontSize(10)
                .text(currentDate, doc.page.width - 150, 40, {
                    width: 100,
                    align: 'right',
                    lineBreak: false
                });
            doc.restore(); // Restaurar estado anterior (remove align right e posições)

            // Posicionar cursor para o texto principal
            doc.x = 72;  // Voltar para margem esquerda
            doc.y = 140; // Altura após logo

            // Configurar fonte e tamanho para o texto principal
            doc.font('Times-Roman');
            doc.fontSize(12);

            // Processar o texto linha por linha
            const lines = text.split('\n');

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];

                // Detectar títulos (linhas em maiúsculas ou que começam com #)
                if (line.trim().startsWith('#')) {
                    doc.fontSize(14)
                        .font('Times-Bold')
                        .text(line.replace(/^#+\s*/, ''), {
                            align: 'left'
                        })
                        .moveDown(0.5);
                    doc.fontSize(12).font('Times-Roman');
                    continue;
                }

                // Linha vazia = espaçamento
                if (line.trim() === '') {
                    doc.moveDown(0.5);
                    continue;
                }

                // Detectar listas (linhas que começam com - ou *)
                if (line.trim().match(/^[-*]\s/)) {
                    doc.text(line, {
                        indent: 20,
                        align: 'left',
                        lineGap: 2
                    });
                    continue;
                }

                // Texto normal - SEMPRE justificado
                doc.text(line, {
                    align: 'justify',
                    lineGap: 2
                });
            }

            // Adicionar carimbos/assinaturas no final
            doc.moveDown(2);

            // Verificar se existem os arquivos de carimbo
            const carimbo1Path = path.join(__dirname, 'carimbo1.png');
            const carimbo2Path = path.join(__dirname, 'carimbo2.png');

            const pageWidth = doc.page.width;
            const margin = 72;
            const availableWidth = pageWidth - (margin * 2);
            const carimboWidth = 150;
            const currentY = doc.y;

            if (fs.existsSync(carimbo1Path) && fs.existsSync(carimbo2Path)) {
                // Ambos existem - colocar lado a lado
                // Carimbo 1 à esquerda
                doc.image(carimbo1Path, margin, currentY, {
                    fit: [carimboWidth, 100]
                });

                // Carimbo 2 à direita
                doc.image(carimbo2Path, pageWidth - margin - carimboWidth, currentY, {
                    fit: [carimboWidth, 100]
                });
            } else if (fs.existsSync(carimbo1Path)) {
                // Apenas carimbo 1
                doc.image(carimbo1Path, margin, currentY, {
                    fit: [carimboWidth, 100]
                });
            } else if (fs.existsSync(carimbo2Path)) {
                // Apenas carimbo 2
                doc.image(carimbo2Path, pageWidth - margin - carimboWidth, currentY, {
                    fit: [carimboWidth, 100]
                });
            }

            // Finalizar o PDF
            doc.end();

        } catch (error) {
            reject(error);
        }
    });
}

module.exports = { generatePDF };
