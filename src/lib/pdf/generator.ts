'use client';
import jsPDF from 'jspdf';
import type { PatientData, ClinicalData, CardiacResult, RenalResult, AIInterpretation } from '@/lib/types';
import { DISCLAIMER, CALCULATOR_VERSIONS, APP_VERSION } from '@/lib/constants';
import { getGFRStageLabel, getAlbuminuriaStageLabel } from '@/lib/calculators/kdigo';

interface PDFData {
    patient: PatientData;
    clinical: ClinicalData;
    cardiac: CardiacResult;
    renal: RenalResult;
    interpretation: AIInterpretation;
}

const CL: Record<string, string> = { low: 'Baixo', moderate: 'Moderado', high: 'Alto', very_high: 'Muito Alto' };

export function generateClinicalPDF(data: PDFData) {
    const { patient, clinical, cardiac, renal, interpretation } = data;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    let y = 15;

    const addPage = () => { doc.addPage(); y = 15; };
    const checkPage = (need: number) => { if (y + need > 275) addPage(); };

    // Header
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageW, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('CardioRenal Risk Report', 15, 15);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Relatório Integrado de Risco Cardiorrenal', 15, 22);
    doc.setFontSize(8);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')} | Versão: ${APP_VERSION}`, 15, 30);
    y = 45;

    // Patient Info
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('1. Identificação do Paciente', 15, y);
    y += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Nome: ${patient.name}`, 15, y); y += 5;
    doc.text(`Idade: ${patient.age} anos | Sexo: ${patient.sex === 'male' ? 'Masculino' : 'Feminino'}`, 15, y); y += 5;
    if (patient.heightCm && patient.weightKg) {
        const bmi = (patient.weightKg / Math.pow(patient.heightCm / 100, 2)).toFixed(1);
        doc.text(`Altura: ${patient.heightCm} cm | Peso: ${patient.weightKg} kg | IMC: ${bmi} kg/m²`, 15, y); y += 5;
    }
    if (patient.externalId) { doc.text(`Prontuário: ${patient.externalId}`, 15, y); y += 5; }
    y += 5;

    // Cardiac Risk
    checkPage(40);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('2. Risco Cardiovascular', 15, y); y += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Modelo: ${CALCULATOR_VERSIONS[cardiac.modelUsed]?.name || cardiac.modelUsed}`, 15, y); y += 5;
    doc.text(`Risco em 10 anos: ${cardiac.risk10yPercent}%`, 15, y); y += 5;
    if (cardiac.risk5yPercent !== null) { doc.text(`Risco em 5 anos: ${cardiac.risk5yPercent}%`, 15, y); y += 5; }
    doc.setFont('helvetica', 'bold');
    doc.text(`Classificação: ${CL[cardiac.classification]}`, 15, y); y += 5;
    doc.setFont('helvetica', 'normal');
    const justLines = doc.splitTextToSize(cardiac.classificationJustification, pageW - 30);
    doc.text(justLines, 15, y); y += justLines.length * 4 + 5;

    // Renal Risk
    checkPage(40);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('3. Avaliação Renal', 15, y); y += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const gfrInfo = getGFRStageLabel(renal.gfrStage);
    const acrInfo = getAlbuminuriaStageLabel(renal.albuminuriaStage);
    doc.text(`TFG estimada (CKD-EPI 2021): ${renal.eGFRCalculated} mL/min/1.73m²`, 15, y); y += 5;
    doc.text(`Estágio GFR: ${renal.gfrStage} – ${gfrInfo.descriptionPtBR}`, 15, y); y += 5;
    doc.text(`Albuminúria: ${renal.albuminuriaStage} – ${acrInfo.descriptionPtBR}`, 15, y); y += 5;
    doc.setFont('helvetica', 'bold');
    doc.text(`Risco KDIGO: ${CL[renal.riskCategory]}`, 15, y); y += 5;
    doc.setFont('helvetica', 'normal');
    if (renal.kfre2yPercent !== null) {
        doc.text(`KFRE – Risco de falência renal: 2 anos: ${renal.kfre2yPercent}% | 5 anos: ${renal.kfre5yPercent}%`, 15, y);
        y += 5;
    }
    y += 5;

    // Red Flags
    if (interpretation.redFlags.length > 0) {
        checkPage(30);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('4. Alertas (Red Flags)', 15, y); y += 8;
        doc.setFontSize(10);
        for (const rf of interpretation.redFlags) {
            checkPage(12);
            doc.setFont('helvetica', 'bold');
            doc.text(`${rf.severity === 'critical' ? '[CRÍTICO]' : '[ATENÇÃO]'} ${rf.flag}`, 15, y); y += 5;
            doc.setFont('helvetica', 'normal');
            const actionLines = doc.splitTextToSize(`→ ${rf.action}`, pageW - 35);
            doc.text(actionLines, 20, y); y += actionLines.length * 4 + 3;
        }
        y += 3;
    }

    // Top Factors
    checkPage(30);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('5. Principais Fatores de Risco', 15, y); y += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    for (const f of interpretation.topFactors) {
        checkPage(10);
        doc.text(`• ${f.factor}: ${f.explanation}`, 15, y); y += 6;
    }
    y += 5;

    // Recommendations
    checkPage(30);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('6. Recomendações', 15, y); y += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    for (const r of interpretation.recommendations) {
        checkPage(12);
        const rLines = doc.splitTextToSize(`• ${r}`, pageW - 30);
        doc.text(rLines, 15, y); y += rLines.length * 4 + 2;
    }
    y += 5;

    // Disclaimer
    addPage();
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('7. Disclaimer e Limitações', 15, y); y += 8;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const discLines = doc.splitTextToSize(DISCLAIMER['pt-BR'], pageW - 30);
    doc.text(discLines, 15, y); y += discLines.length * 4 + 8;

    doc.setFont('helvetica', 'bold');
    doc.text('Limitações dos Modelos:', 15, y); y += 6;
    doc.setFont('helvetica', 'normal');
    for (const l of [...cardiac.metadata.limitations, ...renal.metadata.limitations]) {
        checkPage(8);
        const lLines = doc.splitTextToSize(`• ${l}`, pageW - 30);
        doc.text(lLines, 15, y); y += lLines.length * 3.5 + 2;
    }
    y += 8;

    // Metadata
    checkPage(40);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('8. Metadados do Relatório', 15, y); y += 8;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Modelo cardíaco: ${cardiac.metadata.modelName} (${cardiac.metadata.modelVersion})`, 15, y); y += 4;
    doc.text(`Ref: ${cardiac.metadata.reference}`, 15, y); y += 4;
    doc.text(`eGFR: CKD-EPI 2021 (${CALCULATOR_VERSIONS['ckd-epi'].version})`, 15, y); y += 4;
    doc.text(`Interpretação: ${interpretation.promptVersion}`, 15, y); y += 4;
    doc.text(`App: ${APP_VERSION}`, 15, y); y += 4;
    doc.text(`Data/Hora: ${new Date().toLocaleString('pt-BR')}`, 15, y); y += 10;

    // Signature line
    checkPage(20);
    doc.setDrawColor(200, 200, 200);
    doc.line(15, y, 100, y);
    y += 5;
    doc.setFontSize(10);
    doc.text('Assinatura do Profissional de Saúde', 15, y);

    // Footer on all pages
    const totalPages = doc.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`CardioRenal Risk Report – Página ${i}/${totalPages}`, 15, 290);
        doc.text('Ferramenta de apoio – Não substitui consulta médica', pageW - 15, 290, { align: 'right' });
    }

    doc.save(`CardioRenal_${patient.name.replace(/\s/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`);
}
