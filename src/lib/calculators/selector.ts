// ============================================================
// Calculator Selector – Auto-selects appropriate models
// ============================================================
import type { PatientData, ClinicalData, CardiacResult, RenalResult, ContributingFactor } from '../types';
import { calculateASCVD, isASCVDApplicable } from './ascvd';
import { calculateFramingham, isFraminghamApplicable } from './framingham';
import { calculateSCORE2, isSCORE2Applicable } from './score2';
import { calculateEGFR, getCKDEPIMetadata } from './ckd-epi';
import { getGFRStage, getAlbuminuriaStage, getKDIGORisk, getKDIGOMetadata, getMonitoringFrequency, getGFRStageLabel, getAlbuminuriaStageLabel } from './kdigo';
import { calculateKFRE, isKFREApplicable, getKFREMetadata } from './kfre';
import { CALCULATOR_VERSIONS } from '../constants';
import { v4 as uuidv4 } from 'uuid';

export interface CalculationResults {
    cardiac: CardiacResult;
    renal: RenalResult;
    warnings: string[];
}

/**
 * Main entry point: runs all applicable calculators and returns results
 */
export function runCalculations(
    patient: PatientData,
    clinical: ClinicalData,
    preferences?: { cardiac?: string; renal?: string }
): CalculationResults {
    const warnings: string[] = [];

    // Calculate eGFR if not provided
    let eGFR = clinical.eGFR;
    if (!eGFR && clinical.serumCreatinine && patient.age && patient.sex) {
        eGFR = calculateEGFR({
            age: patient.age,
            sex: patient.sex,
            serumCreatinine: clinical.serumCreatinine,
        });
    }

    // --- CARDIAC ---
    const cardiac = selectAndRunCardiacCalculator(patient, clinical, preferences?.cardiac, warnings);

    // --- RENAL ---
    const renal = runRenalCalculation(patient, clinical, eGFR!, warnings);

    return { cardiac, renal, warnings };
}

function selectAndRunCardiacCalculator(
    patient: PatientData,
    clinical: ClinicalData,
    preference: string | undefined,
    warnings: string[]
): CardiacResult {
    const age = patient.age;
    const race = patient.ethnicity === 'black' ? 'black' : (patient.ethnicity === 'white' ? 'white' : 'other');

    // Try preferred model first
    if (preference === 'ascvd' && isASCVDApplicable(age)) {
        return calculateASCVD({
            age, sex: patient.sex, race,
            totalCholesterol: clinical.totalCholesterol,
            hdlCholesterol: clinical.hdlCholesterol,
            systolicBP: clinical.systolicBP,
            onBPMedication: clinical.onBPMedication,
            hasDiabetes: clinical.hasDiabetes,
            isSmoker: clinical.isSmoker,
        });
    }

    if (preference === 'score2' && isSCORE2Applicable(age)) {
        return calculateSCORE2({
            age, sex: patient.sex,
            totalCholesterol: clinical.totalCholesterol,
            hdlCholesterol: clinical.hdlCholesterol,
            systolicBP: clinical.systolicBP,
            isSmoker: clinical.isSmoker,
        });
    }

    if (preference === 'framingham' && isFraminghamApplicable(age)) {
        return calculateFramingham({
            age, sex: patient.sex,
            totalCholesterol: clinical.totalCholesterol,
            hdlCholesterol: clinical.hdlCholesterol,
            systolicBP: clinical.systolicBP,
            onBPMedication: clinical.onBPMedication,
            hasDiabetes: clinical.hasDiabetes,
            isSmoker: clinical.isSmoker,
        });
    }

    // Auto-select: prefer ASCVD for 40-79, then SCORE2 for 40-69, then Framingham for 30-74
    if (isASCVDApplicable(age)) {
        warnings.push('Modelo selecionado automaticamente: ASCVD (Pooled Cohort Equations)');
        return calculateASCVD({
            age, sex: patient.sex, race,
            totalCholesterol: clinical.totalCholesterol,
            hdlCholesterol: clinical.hdlCholesterol,
            systolicBP: clinical.systolicBP,
            onBPMedication: clinical.onBPMedication,
            hasDiabetes: clinical.hasDiabetes,
            isSmoker: clinical.isSmoker,
        });
    }

    if (isFraminghamApplicable(age)) {
        warnings.push('Idade fora da faixa ASCVD. Usando Framingham Risk Score como alternativa.');
        return calculateFramingham({
            age, sex: patient.sex,
            totalCholesterol: clinical.totalCholesterol,
            hdlCholesterol: clinical.hdlCholesterol,
            systolicBP: clinical.systolicBP,
            onBPMedication: clinical.onBPMedication,
            hasDiabetes: clinical.hasDiabetes,
            isSmoker: clinical.isSmoker,
        });
    }

    // Fallback: return a minimal result
    warnings.push('Nenhum modelo cardíaco aplicável para a idade informada. Resultados limitados.');
    return {
        id: uuidv4(),
        modelUsed: 'framingham',
        risk5yPercent: null,
        risk10yPercent: 0,
        classification: 'low',
        classificationJustification: 'Não foi possível calcular o risco com os dados disponíveis.',
        contributingFactors: [],
        metadata: {
            modelName: 'N/A',
            modelVersion: 'N/A',
            reference: 'N/A',
            applicablePopulation: 'N/A',
            calculatedAt: new Date().toISOString(),
            inputsUsed: {},
            limitations: ['Nenhum modelo aplicável para os dados fornecidos'],
        },
    };
}

function runRenalCalculation(
    patient: PatientData,
    clinical: ClinicalData,
    eGFR: number,
    warnings: string[]
): RenalResult {
    const gfrStage = getGFRStage(eGFR);
    const albuminuriaStage = getAlbuminuriaStage(clinical.acr);
    const riskCategory = getKDIGORisk(gfrStage, albuminuriaStage);

    let kfre2y: number | null = null;
    let kfre5y: number | null = null;

    // Run KFRE if applicable (eGFR 3-59)
    if (clinical.acr !== undefined && isKFREApplicable(eGFR)) {
        const kfreResult = calculateKFRE({
            age: patient.age,
            sex: patient.sex,
            eGFR,
            acr: clinical.acr,
        });
        kfre2y = kfreResult.kfre2yPercent;
        kfre5y = kfreResult.kfre5yPercent;
    } else if (eGFR >= 60) {
        warnings.push('KFRE não aplicável para eGFR ≥ 60 mL/min/1.73m². Exibindo apenas estadiamento KDIGO.');
    } else if (clinical.acr === undefined) {
        warnings.push('ACR não informado. KFRE requer albuminúria para cálculo do risco de falência renal.');
    }

    const factors: ContributingFactor[] = [];

    if (eGFR < 30) {
        factors.push({ factor: 'TFG gravemente reduzida', impact: 'high', description: `eGFR de ${eGFR} mL/min/1.73m² (estágio ${gfrStage})`, modifiable: false });
    } else if (eGFR < 60) {
        factors.push({ factor: 'TFG reduzida', impact: 'moderate', description: `eGFR de ${eGFR} mL/min/1.73m² (estágio ${gfrStage})`, modifiable: false });
    }

    if (clinical.acr && clinical.acr >= 300) {
        factors.push({ factor: 'Albuminúria grave', impact: 'high', description: `ACR ${clinical.acr} mg/g (${albuminuriaStage})`, modifiable: true });
    } else if (clinical.acr && clinical.acr >= 30) {
        factors.push({ factor: 'Albuminúria moderada', impact: 'moderate', description: `ACR ${clinical.acr} mg/g (${albuminuriaStage})`, modifiable: true });
    }

    if (clinical.hasDiabetes) {
        factors.push({ factor: 'Nefropatia diabética', impact: 'high', description: 'Diabetes é a principal causa de DRC', modifiable: true });
    }

    if (clinical.systolicBP >= 140) {
        factors.push({ factor: 'Hipertensão', impact: 'moderate', description: `PAS ${clinical.systolicBP} mmHg acelera progressão da DRC`, modifiable: true });
    }

    if (clinical.potassium && clinical.potassium > 5.5) {
        factors.push({ factor: 'Hipercalemia', impact: 'high', description: `Potássio ${clinical.potassium} mEq/L (> 5.5)`, modifiable: true });
    }

    const kdigoMeta = getKDIGOMetadata({ eGFR, acr: clinical.acr });
    const monitoring = getMonitoringFrequency(riskCategory);

    return {
        id: uuidv4(),
        modelUsed: 'kdigo',
        eGFRCalculated: eGFR,
        gfrStage,
        albuminuriaStage,
        riskCategory,
        kfre2yPercent: kfre2y,
        kfre5yPercent: kfre5y,
        contributingFactors: factors,
        metadata: {
            ...kdigoMeta,
            inputsUsed: {
                ...kdigoMeta.inputsUsed,
                serumCreatinine: clinical.serumCreatinine,
                monitoring,
            },
            limitations: [
                ...kdigoMeta.limitations,
                'eGFR calculado pela CKD-EPI 2021 (sem raça)',
            ],
        },
    };
}
