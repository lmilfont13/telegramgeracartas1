// ============================================================
// AI Interpretation Module – Rule-Based Fallback
// (No external API required for MVP)
// ============================================================
import type { CardiacResult, RenalResult, AIInterpretation, PatientData, ClinicalData } from '../types';
import { CALCULATOR_VERSIONS, DISCLAIMER_SHORT } from '../constants';
import { getGFRStageLabel, getAlbuminuriaStageLabel, getMonitoringFrequency } from '../calculators/kdigo';
import { v4 as uuidv4 } from 'uuid';

const PROMPT_VERSION = 'rule-based-v1.0';

export function generateInterpretation(
    patient: PatientData,
    clinical: ClinicalData,
    cardiac: CardiacResult,
    renal: RenalResult,
    language: 'pt-BR' | 'en-US' = 'pt-BR'
): AIInterpretation {
    if (language === 'pt-BR') {
        return generatePtBR(patient, clinical, cardiac, renal);
    }
    return generateEnUS(patient, clinical, cardiac, renal);
}

function generatePtBR(
    patient: PatientData,
    clinical: ClinicalData,
    cardiac: CardiacResult,
    renal: RenalResult
): AIInterpretation {
    const gfrInfo = getGFRStageLabel(renal.gfrStage);
    const acrInfo = getAlbuminuriaStageLabel(renal.albuminuriaStage);
    const monitoring = getMonitoringFrequency(renal.riskCategory);

    const classLabel: Record<string, string> = {
        low: 'baixo', moderate: 'moderado', high: 'alto', very_high: 'muito alto',
    };

    // Clinical Summary
    const sections: string[] = [];
    sections.push(`Paciente ${patient.name}, ${patient.age} anos, sexo ${patient.sex === 'male' ? 'masculino' : 'feminino'}.`);
    sections.push('');
    sections.push(`**Risco Cardiovascular (${CALCULATOR_VERSIONS[cardiac.modelUsed].name}):**`);
    sections.push(`- Risco em 10 anos: ${cardiac.risk10yPercent}%${cardiac.risk5yPercent ? ` | Risco em 5 anos: ${cardiac.risk5yPercent}%` : ''}`);
    sections.push(`- Classificação: ${classLabel[cardiac.classification] || cardiac.classification}`);
    sections.push(`- ${cardiac.classificationJustification}`);
    sections.push('');
    sections.push(`**Avaliação Renal (KDIGO/CKD-EPI):**`);
    sections.push(`- TFG estimada: ${renal.eGFRCalculated} mL/min/1.73m² (${gfrInfo.label}: ${gfrInfo.descriptionPtBR})`);
    sections.push(`- Albuminúria: ${acrInfo.label} (${acrInfo.descriptionPtBR})`);
    sections.push(`- Risco renal: ${classLabel[renal.riskCategory]}`);

    if (renal.kfre2yPercent !== null) {
        sections.push(`- KFRE: Risco de falência renal em 2 anos: ${renal.kfre2yPercent}% | em 5 anos: ${renal.kfre5yPercent}%`);
    }

    sections.push(`- Frequência de monitoramento recomendada: ${monitoring}`);
    const clinicalSummary = sections.join('\n');

    // Lay Summary
    const laySections: string[] = [];
    laySections.push(`Para o(a) paciente ${patient.name}:`);
    laySections.push('');
    laySections.push(`Seus exames mostram que o risco de ter um problema no coração (como infarto ou AVC) nos próximos 10 anos é de ${cardiac.risk10yPercent}%, considerado ${classLabel[cardiac.classification]}.`);
    laySections.push('');
    laySections.push(`Em relação aos rins, a função renal está ${gfrInfo.descriptionPtBR.toLowerCase()} (TFG de ${renal.eGFRCalculated}).`);

    if (renal.kfre5yPercent !== null && renal.kfre5yPercent > 5) {
        laySections.push(`Existe um risco de ${renal.kfre5yPercent}% de precisar de diálise nos próximos 5 anos.`);
    }

    laySections.push('');
    laySections.push('É muito importante seguir as orientações do seu médico, tomar os medicamentos regularmente e manter hábitos saudáveis.');
    const laySummary = laySections.join('\n');

    // Top factors
    const allFactors = [...cardiac.contributingFactors, ...renal.contributingFactors];
    const topFactors = allFactors
        .filter((f, i, arr) => arr.findIndex(x => x.factor === f.factor) === i)
        .sort((a, b) => ({ high: 0, moderate: 1, low: 2 }[a.impact] - { high: 0, moderate: 1, low: 2 }[b.impact]))
        .slice(0, 5)
        .map(f => ({
            factor: f.factor,
            explanation: `${f.description}${f.modifiable ? ' (fator modificável – pode ser melhorado)' : ' (fator não modificável)'}`,
        }));

    // Recommendations
    const recommendations = generateRecommendations(patient, clinical, cardiac, renal);

    // Red Flags
    const redFlags = detectRedFlags(clinical, renal);

    return {
        id: uuidv4(),
        promptVersion: PROMPT_VERSION,
        language: 'pt-BR',
        clinicalSummary,
        laySummary,
        topFactors,
        recommendations,
        redFlags,
        limitations: [
            'Esta interpretação é gerada por regras determinísticas, não por IA generativa.',
            'Não considera o contexto clínico completo como comorbidades não listadas.',
            DISCLAIMER_SHORT['pt-BR'],
        ],
        generatedAt: new Date().toISOString(),
    };
}

function generateEnUS(
    patient: PatientData,
    clinical: ClinicalData,
    cardiac: CardiacResult,
    renal: RenalResult
): AIInterpretation {
    const gfrInfo = getGFRStageLabel(renal.gfrStage);
    const acrInfo = getAlbuminuriaStageLabel(renal.albuminuriaStage);

    const clinicalSummary = [
        `Patient ${patient.name}, ${patient.age} years old, ${patient.sex}.`,
        '',
        `**Cardiovascular Risk (${CALCULATOR_VERSIONS[cardiac.modelUsed].name}):**`,
        `- 10-year risk: ${cardiac.risk10yPercent}%${cardiac.risk5yPercent ? ` | 5-year risk: ${cardiac.risk5yPercent}%` : ''}`,
        `- Classification: ${cardiac.classification}`,
        '',
        `**Renal Assessment (KDIGO/CKD-EPI):**`,
        `- eGFR: ${renal.eGFRCalculated} mL/min/1.73m² (${gfrInfo.label}: ${gfrInfo.description})`,
        `- Albuminuria: ${acrInfo.label} (${acrInfo.description})`,
        `- Renal risk: ${renal.riskCategory}`,
    ].join('\n');

    const laySummary = `Your test results show a ${cardiac.risk10yPercent}% chance of heart problems in the next 10 years. Your kidney function is ${gfrInfo.description.toLowerCase()}. Follow your doctor's guidance.`;

    return {
        id: uuidv4(),
        promptVersion: PROMPT_VERSION,
        language: 'en-US',
        clinicalSummary,
        laySummary,
        topFactors: [],
        recommendations: [],
        redFlags: detectRedFlags(clinical, renal),
        limitations: [DISCLAIMER_SHORT['en-US']],
        generatedAt: new Date().toISOString(),
    };
}

function generateRecommendations(
    patient: PatientData,
    clinical: ClinicalData,
    cardiac: CardiacResult,
    renal: RenalResult
): string[] {
    const recs: string[] = [];

    // Cardiovascular recommendations
    if (cardiac.classification === 'high' || cardiac.classification === 'very_high') {
        recs.push('Discutir com médico sobre início ou intensificação de terapia com estatina');
        recs.push('Avaliar necessidade de terapia antiplaquetária (discutir com médico)');
    }
    if (cardiac.classification === 'moderate') {
        recs.push('Considerar fatores de risco adicionais (cálcio coronário, PCR) para refinar estratificação');
    }

    // Blood pressure
    if (clinical.systolicBP >= 140 || clinical.diastolicBP >= 90) {
        recs.push('Otimizar controle pressórico – alvo PA < 130/80 mmHg (discutir com médico)');
    }

    // Lipids
    if (clinical.ldlCholesterol && clinical.ldlCholesterol >= 160) {
        recs.push('LDL colesterol elevado – avaliar indicação de estatina com médico');
    }

    // Diabetes
    if (clinical.hasDiabetes) {
        recs.push('Controle glicêmico adequado (HbA1c alvo individualizado)');
        if (!clinical.onSGLT2 && renal.eGFRCalculated >= 20) {
            recs.push('Considerar uso de inibidor SGLT2 (benefício cardiorrenal) – discutir com médico');
        }
    }

    // Smoking
    if (clinical.isSmoker) {
        recs.push('Cessação do tabagismo – principal fator de risco modificável');
    }

    // Renal-specific
    if (renal.riskCategory === 'high' || renal.riskCategory === 'very_high') {
        recs.push('Encaminhamento a nefrologista para acompanhamento conjunto');
    }
    if (!clinical.onACEIorARB && clinical.acr && clinical.acr >= 30) {
        recs.push('Considerar IECA/BRA para nefroproteção (discutir com médico)');
    }

    // Lifestyle
    recs.push('Orientações de estilo de vida: dieta balanceada, atividade física regular, controle de peso');
    recs.push('Monitoramento laboratorial periódico conforme classificação de risco');

    // Exams
    const exams: string[] = [];
    exams.push('Perfil lipídico completo');
    exams.push('Creatinina e TFG estimada');
    if (!clinical.acr) exams.push('Relação albumina/creatinina urinária (ACR)');
    exams.push('Hemoglobina glicada (HbA1c)');
    exams.push('Eletrólitos (Na, K, Ca, P)');
    if (cardiac.classification !== 'low') exams.push('ECG de repouso');
    if (cardiac.classification === 'high' || cardiac.classification === 'very_high') exams.push('Ecocardiograma');

    recs.push(`Exames sugeridos para acompanhamento: ${exams.join(', ')}`);

    return recs;
}

function detectRedFlags(
    clinical: ClinicalData,
    renal: RenalResult
): { flag: string; severity: 'warning' | 'critical'; action: string }[] {
    const flags: { flag: string; severity: 'warning' | 'critical'; action: string }[] = [];

    if (clinical.systolicBP >= 180 || clinical.diastolicBP >= 120) {
        flags.push({
            flag: `PA muito elevada: ${clinical.systolicBP}/${clinical.diastolicBP} mmHg`,
            severity: 'critical',
            action: 'Avaliar emergência hipertensiva. Procurar atendimento médico imediato se sintomático.',
        });
    }

    if (clinical.potassium && clinical.potassium >= 6.0) {
        flags.push({
            flag: `Hipercalemia grave: K+ ${clinical.potassium} mEq/L`,
            severity: 'critical',
            action: 'Risco de arritmia cardíaca. ECG urgente e tratamento imediato.',
        });
    } else if (clinical.potassium && clinical.potassium >= 5.5) {
        flags.push({
            flag: `Hipercalemia: K+ ${clinical.potassium} mEq/L`,
            severity: 'warning',
            action: 'Monitorar e considerar ajuste medicamentoso. Discutir com médico.',
        });
    }

    if (renal.eGFRCalculated < 15) {
        flags.push({
            flag: `TFG < 15 mL/min/1.73m² – Insuficiência renal (estágio G5)`,
            severity: 'critical',
            action: 'Encaminhamento urgente a nefrologista. Avaliar necessidade de terapia renal substitutiva.',
        });
    } else if (renal.eGFRCalculated < 30) {
        flags.push({
            flag: `TFG < 30 mL/min/1.73m² – Doença renal avançada (estágio ${renal.gfrStage})`,
            severity: 'warning',
            action: 'Acompanhamento com nefrologista. Revisar doses de medicamentos.',
        });
    }

    if (clinical.hba1c && clinical.hba1c > 10) {
        flags.push({
            flag: `HbA1c muito elevada: ${clinical.hba1c}%`,
            severity: 'warning',
            action: 'Controle glicêmico inadequado. Intensificar tratamento e avaliar aderência.',
        });
    }

    if (renal.kfre2yPercent !== null && renal.kfre2yPercent > 20) {
        flags.push({
            flag: `Alto risco de falência renal em 2 anos: ${renal.kfre2yPercent}%`,
            severity: 'critical',
            action: 'Preparar para terapia renal substitutiva. Discutir opções (diálise, transplante) com nefrologista.',
        });
    }

    return flags;
}
