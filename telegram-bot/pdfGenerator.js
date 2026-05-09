const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Gera um PDF profissional com layout blindado contra sobreposição
 * @param {string} text - Texto completo da carta
 * @returns {Promise<Buffer>} - Buffer do PDF gerado
 */
async function generatePDF(text) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({
                size: 'A4',
                margins: { top: 50, bottom: 50, left: 50, right: 50 },
                bufferPages: true
            });

            const chunks = [];
            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            // --- ELEMENTOS FIXOS ---
            
            // 1. Logo
            const logoPath = path.join(__dirname, 'logo.png');
            if (fs.existsSync(logoPath)) {
                doc.image(logoPath, 50, 40, { width: 100 });
            }

            // 2. Data de Emissão (Topo Direito)
            const dataAtual = new Date().toLocaleDateString('pt-BR', { 
                day: 'numeric', 
                month: 'long', 
                year: 'numeric' 
            }).toUpperCase();
            
            doc.font('Helvetica-Bold').fontSize(7)
                .text(`VERSÃO 3.0 - DATA DE EMISSÃO: ${dataAtual}`, 0, 40, { align: 'right', width: 550 });

            // --- CABEÇALHO (Posicionamento Absoluto para evitar sobreposição) ---
            
            const lines = text.split('\n').map(l => l.trim());
            
            // Extração de campos-chave
            const loja = lines.find(l => l.toUpperCase().includes('A LOJA:')) || '';
            const ac = lines.find(l => l.includes('A/C.:')) || 'A/C.: Prevenção de perdas';
            const ref = lines.find(l => l.includes('Ref.:')) || '';
            const saudacao = lines.find(l => l.includes('Prezado(a),')) || 'Prezado(a),';

            // Escrita do Cabeçalho com espaçamento generoso (20 unidades entre linhas)
            doc.font('Helvetica-Bold').fontSize(10.5).text(loja, 50, 100);
            doc.font('Helvetica-Bold').fontSize(10.5).text(ac, 50, 120);
            doc.font('Helvetica-Bold').fontSize(10.5).text(ref, 50, 145);
            doc.font('Helvetica').fontSize(10.5).text(saudacao, 50, 175);

            // --- CORPO DO TEXTO (Fluxo Inteligente) ---
            
            let currentY = 200;
            
            // Filtrar apenas o conteúdo real (ignorar o que já foi no cabeçalho ou assinaturas)
            const bodyParagraphs = lines.filter(line => {
                const l = line.toUpperCase();
                return line.length > 5 && 
                       !l.includes('A LOJA:') && 
                       !l.includes('A/C.:') && 
                       !l.includes('REF.:') && 
                       !l.includes('PREZADO(A),') &&
                       !l.includes('SEM MAIS,') &&
                       !l.includes('ATENCIOSAMENTE,') &&
                       !line.includes('/'); // Evita linhas de data/assinatura no meio do corpo
            });

            bodyParagraphs.forEach(p => {
                // Limpeza de placeholders redundantes
                const cleanText = p.replace(/PROMOTOR/g, '').replace(/\(a\)\s+\(a\)/g, '(a)').trim();
                
                if (cleanText.length > 10) {
                    const height = doc.heightOfString(cleanText, { width: 500, align: 'justify', lineGap: 2 });
                    
                    // Verificar se vai estourar a página (raro, mas segurança)
                    if (currentY + height > 700) {
                        doc.addPage();
                        currentY = 50;
                    }

                    doc.font('Helvetica').fontSize(10.5)
                       .text(cleanText, 50, currentY, { width: 500, align: 'justify', lineGap: 2 });
                    
                    currentY += height + 15;
                }
            });

            // --- RODAPÉ E CARIMBOS (Blindagem de Página Única) ---
            
            const stampY = 580; // Forçamos os carimbos para o final da página 1
            
            doc.font('Helvetica').fontSize(10.5).text('Sem mais,', 50, stampY);

            const carimbo1 = path.join(__dirname, 'carimbo1.png');
            const carimbo2 = path.join(__dirname, 'carimbo2.png');

            if (fs.existsSync(carimbo1)) {
                doc.image(carimbo1, 50, stampY + 25, { width: 160 });
            }
            
            if (fs.existsSync(carimbo2)) {
                doc.image(carimbo2, 380, stampY + 15, { width: 165 });
            }

            // Endereço fixo no rodapé (Layout Premium)
            const endereco = "Rua Demóstenes, 907 - Campo Belo - São Paulo - SP - Brasil - CEP 04614-013 - Fone: 55 11 3508-3160";
            doc.fontSize(8).fillColor('gray')
               .text(endereco, 50, 785, { align: 'center', width: 500 });

            doc.end();
        } catch (err) {
            reject(err);
        }
    });
}

module.exports = { generatePDF };
