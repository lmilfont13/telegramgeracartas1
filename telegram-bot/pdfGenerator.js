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
            doc.font('Helvetica'); // Helvetica é mais moderna que Times
            doc.fontSize(10.5);

            // Processar o texto linha por linha
            const lines = text.split('\n');

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();

                // Linha vazia = espaçamento controlado
                if (line === '') {
                    doc.moveDown(0.4);
                    continue;
                }

                // Detectar títulos (linhas em maiúsculas ou que começam com #)
                if (line.startsWith('#')) {
                    doc.fontSize(12)
                        .font('Helvetica-Bold')
                        .text(line.replace(/^#+\s*/, ''), { align: 'left' })
                        .moveDown(0.3);
                    doc.fontSize(10.5).font('Helvetica');
                    continue;
                }

                // Estilo especial para linhas de cabeçalho (A Loja, A/C, Ref)
                const isHeaderLine = line.startsWith('A Loja:') || line.startsWith('A/C:') || line.startsWith('Ref.:');
                
                if (isHeaderLine) {
                    doc.font('Helvetica-Bold')
                        .text(line, { align: 'left', lineGap: 1 })
                        .moveDown(0.2);
                    doc.font('Helvetica');
                } else {
                    doc.text(line, {
                        align: 'justify',
                        lineGap: 1
                    });
                }
            }

            // Adicionar carimbos/assinaturas no final (Página Única)
            // Se o espaço for muito pouco, reduz o moveDown
            const remainingHeight = doc.page.height - doc.y - 72;
            if (remainingHeight < 120) {
                doc.moveDown(0.5);
            } else {
                doc.moveDown(1.5);
            }

            // Verificar se existem os arquivos de carimbo
            const carimbo1Path = path.join(__dirname, 'carimbo1.png');
            const carimbo2Path = path.join(__dirname, 'carimbo2.png');

            const pageWidth = doc.page.width;
            const margin = 72;
            const carimboWidth = 140;
            let currentY = doc.y;

            // Garantir que os carimbos não causem quebra de página se estiverem no limite
            if (currentY > 650) currentY = 650;

            if (fs.existsSync(carimbo1Path) && fs.existsSync(carimbo2Path)) {
                doc.image(carimbo1Path, margin, currentY, { fit: [carimboWidth, 80] });
                doc.image(carimbo2Path, pageWidth - margin - carimboWidth, currentY, { fit: [carimboWidth, 80] });
            } else if (fs.existsSync(carimbo1Path)) {
                doc.image(carimbo1Path, margin, currentY, { fit: [carimboWidth, 80] });
            } else if (fs.existsSync(carimbo2Path)) {
                doc.image(carimbo2Path, pageWidth - margin - carimboWidth, currentY, { fit: [carimboWidth, 80] });
            }

            // Finalizar o PDF
            doc.end();

        } catch (error) {
            reject(error);
        }
    });
}

module.exports = { generatePDF };
