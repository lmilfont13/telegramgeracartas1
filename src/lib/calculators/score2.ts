// ============================================================
// SCORE2 Calculator (Simplified Approximation)
// Reference: SCORE2 working group. Eur Heart J. 2021;42(25):2439-2454.
// ============================================================
import type { CardiacResult, ContributingFactor, RiskClassification } from '../types';
import { CALCULATOR_VERSIONS } from '../constants';
import { v4 as uuidv4 } from 'uuid';

interface SCORE2Input {
    age: number;
    sex: 'male' | 'female';
    totalCholesterol: number; // mg/dL
    hdlCholesterol: number; // mg/dL
    systolicBP: number; // mmHg
    isSmoker: boolean;
    region?: 'low' | 'moderate' | 'high' | 'very_high'; // CVD risk region
}

/**
 * SCORE2 10-year CVD risk estimation (simplified model)
 * Uses a Cox-regression-based approximation with published coefficients.
 * Note: This is a simplified version; the full SCORE2 uses region-specific
 * recalibration with baseline hazard tables not fully published.
 */
export function calculateSCORE2(input: SCORE2Input): CardiacResult {
    const { age, sex, totalCholesterol, hdlCholesterol, systolicBP, isSmoker, region = 'moderate' } = input;

    // Non-HDL cholesterol in mmol/L
    const nonHDL_mmol = (totalCholesterol - hdlCholesterol) * 0.02586;
    const sbpCentered = systolicBP - 120;
    const ageCentered = age - 60;

    // Simplified risk model based on SCORE2 published hazard ratios
    let logHR = 0;

    if (sex === 'male') {
        logHR += 0.064 * ageCentered;
        logHR += 0.0015 * ageCentered * ageCentered;
        logHR += 0.24 * nonHDL_mmol;
        logHR += 0.018 * sbpCentered;
        logHR += isSmoker ? 0.55 : 0;
    } else {
        logHR += 0.072 * ageCentered;
        logHR += 0.002 * ageCentered * ageCentered;
        logHR += 0.28 * nonHDL_mmol;
        logHR += 0.022 * sbpCentered;
        logHR += isSmoker ? 0.62 : 0;
    }

    // Regional baseline 10-year risk at age 60 (approximate)
    const baselineRisk: Record<string, Record<string, number>> = {
        low: { male: 0.04, female: 0.02 },
        moderate: { male: 0.06, female: 0.03 },
        high: { male: 0.09, female: 0.05 },
        very_high: { male: 0.14, female: 0.08 },
    };

    const baseline = baselineRisk[region][sex];
    const risk10y = 1 - Math.pow(1 - baseline, Math.exp(logHR));
    const risk10yPercent = Math.round(Math.max(0, Math.min(100, risk10y * 100)) * 10) / 10;
    const risk5yPercent = Math.round(risk10yPercent * 0.5 * 10) / 10;

    const classification = classifySCORE2Risk(risk10yPercent, age);
    const factors = getSCORE2Factors(input);

    const info = CALCULATOR_VERSIONS.score2;

    return {
        id: uuidv4(),
        modelUsed: 'score2',
        risk5yPercent,
        risk10yPercent,
        classification: classification.level,
        classificationJustification: classification.justification,
        contributingFactors: factors,
        metadata: {
            modelName: info.name,
            modelVersion: info.version,
            reference: info.reference,
            applicablePopulation: info.applicablePopulation,
            calculatedAt: new Date().toISOString(),
            inputsUsed: { ...input },
            limitations: [
                'This is a simplified approximation of SCORE2; full model requires region-specific baseline hazard tables',
                'Valid for ages 40-69 (SCORE2-OP for ≥ 70)',
                'Developed for and validated in European populations',
                'Does not account for diabetes directly (considered in management, not score)',
            ],
        },
    };
}

function classifySCORE2Risk(risk: number, age: number): { level: RiskClassification; justification: string } {
    // ESC 2021 thresholds vary by age
    if (age < 50) {
        if (risk < 2.5) return { level: 'low', justification: `SCORE2 de ${risk}% (< 2.5% para < 50 anos). Baixo risco.` };
        if (risk < 7.5) return { level: 'moderate', justification: `SCORE2 de ${risk}% (2.5-7.4% para < 50 anos). Risco moderado.` };
        return { level: 'high', justification: `SCORE2 de ${risk}% (≥ 7.5% para < 50 anos). Alto risco.` };
    } else {
        if (risk < 5) return { level: 'low', justification: `SCORE2 de ${risk}% (< 5% para ≥ 50 anos). Baixo risco.` };
        if (risk < 10) return { level: 'moderate', justification: `SCORE2 de ${risk}% (5-9.9% para ≥ 50 anos). Risco moderado.` };
        return { level: 'high', justification: `SCORE2 de ${risk}% (≥ 10% para ≥ 50 anos). Alto risco.` };
    }
}

function getSCORE2Factors(input: SCORE2Input): ContributingFactor[] {
    const factors: ContributingFactor[] = [];
    if (input.isSmoker) factors.push({ factor: 'Tabagismo', impact: 'high', description: 'Tabagismo ativo é o principal fator de risco modificável', modifiable: true });
    if (input.systolicBP >= 140) factors.push({ factor: 'Hipertensão', impact: 'high', description: `PAS ${input.systolicBP} mmHg`, modifiable: true });
    if ((input.totalCholesterol - input.hdlCholesterol) >= 160) factors.push({ factor: 'Colesterol não-HDL elevado', impact: 'moderate', description: `Não-HDL ${input.totalCholesterol - input.hdlCholesterol} mg/dL`, modifiable: true });
    if (input.age >= 60) factors.push({ factor: 'Idade', impact: 'moderate', description: `${input.age} anos`, modifiable: false });
    return factors;
}

export function isSCORE2Applicable(age: number): boolean {
    return age >= 40 && age <= 69;
}
