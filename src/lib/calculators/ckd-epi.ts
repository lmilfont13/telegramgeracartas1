// ============================================================
// CKD-EPI 2021 eGFR Calculator (Race-Free)
// Reference: Inker LA, et al. N Engl J Med. 2021;385(19):1737-1749.
// ============================================================
import { CALCULATOR_VERSIONS } from '../constants';

interface CKDEPIInput {
    age: number;
    sex: 'male' | 'female';
    serumCreatinine: number; // mg/dL
}

/**
 * CKD-EPI 2021 Creatinine Equation (Race-Free)
 * eGFR = 142 × min(Scr/κ, 1)^α × max(Scr/κ, 1)^(-1.200) × 0.9938^Age × (1.012 if female)
 * where κ = 0.7 (female) or 0.9 (male), α = -0.241 (female) or -0.302 (male)
 */
export function calculateEGFR(input: CKDEPIInput): number {
    const { age, sex, serumCreatinine } = input;

    const kappa = sex === 'female' ? 0.7 : 0.9;
    const alpha = sex === 'female' ? -0.241 : -0.302;
    const sexMultiplier = sex === 'female' ? 1.012 : 1.0;

    const scrOverKappa = serumCreatinine / kappa;
    const minTerm = Math.pow(Math.min(scrOverKappa, 1), alpha);
    const maxTerm = Math.pow(Math.max(scrOverKappa, 1), -1.200);

    const eGFR = 142 * minTerm * maxTerm * Math.pow(0.9938, age) * sexMultiplier;

    return Math.round(eGFR * 10) / 10;
}

export function getCKDEPIMetadata(input: CKDEPIInput) {
    const info = CALCULATOR_VERSIONS['ckd-epi'];
    return {
        modelName: info.name,
        modelVersion: info.version,
        reference: info.reference,
        applicablePopulation: info.applicablePopulation,
        calculatedAt: new Date().toISOString(),
        inputsUsed: { ...input },
        limitations: [
            'Accuracy may be lower at extremes of body composition (very muscular or cachectic patients)',
            'Not validated in pregnant women',
            'Acute kidney injury may cause inaccurate results',
            'Diet (e.g., high meat intake) can temporarily affect serum creatinine',
        ],
    };
}
