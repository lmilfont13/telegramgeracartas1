// ============================================================
// KFRE – Kidney Failure Risk Equation
// Reference: Tangri N, et al. JAMA. 2016;315(2):164-174.
// ============================================================
import { CALCULATOR_VERSIONS } from '../constants';

interface KFREInput {
    age: number;
    sex: 'male' | 'female';
    eGFR: number; // mL/min/1.73m²
    acr: number; // mg/g
}

interface KFREResult {
    kfre2yPercent: number;
    kfre5yPercent: number;
}

/**
 * KFRE 4-variable equation
 * Predicts 2-year and 5-year risk of kidney failure (need for dialysis or transplant)
 *
 * Formula:
 * Risk = 1 - S0(t)^exp(sum)
 * where sum = β1×(age/10 - 7.036) + β2×(male - 0.5642) + β3×(eGFR/5 - 7.222) + β4×(log(ACR) - 5.137)
 *
 * Coefficients (4-variable model, non-North American recalibrated):
 *   β_age = 0.2694
 *   β_male = 0.2167
 *   β_eGFR = -0.5567
 *   β_logACR = 0.4510
 *
 * Baseline survival (North American):
 *   S0(2y) = 0.9832
 *   S0(5y) = 0.9365
 */
export function calculateKFRE(input: KFREInput): KFREResult {
    const { age, sex, eGFR, acr } = input;

    // Center variables
    const ageTerm = age / 10 - 7.036;
    const maleTerm = (sex === 'male' ? 1 : 0) - 0.5642;
    const eGFRTerm = eGFR / 5 - 7.222;
    const lnACRTerm = Math.log(Math.max(acr, 1)) - 5.137;

    // Coefficients (4-variable model)
    const beta = {
        age: 0.2694,
        male: 0.2167,
        eGFR: -0.5567,
        lnACR: 0.4510,
    };

    const linearPredictor =
        beta.age * ageTerm +
        beta.male * maleTerm +
        beta.eGFR * eGFRTerm +
        beta.lnACR * lnACRTerm;

    // Baseline survival
    const S0_2y = 0.9832;
    const S0_5y = 0.9365;

    const risk2y = 1 - Math.pow(S0_2y, Math.exp(linearPredictor));
    const risk5y = 1 - Math.pow(S0_5y, Math.exp(linearPredictor));

    return {
        kfre2yPercent: Math.round(Math.max(0, Math.min(100, risk2y * 100)) * 10) / 10,
        kfre5yPercent: Math.round(Math.max(0, Math.min(100, risk5y * 100)) * 10) / 10,
    };
}

/**
 * KFRE is applicable for patients with eGFR 3-59 mL/min/1.73m² (CKD stages 3-5)
 */
export function isKFREApplicable(eGFR: number): boolean {
    return eGFR >= 3 && eGFR < 60;
}

export function getKFREMetadata(input: KFREInput) {
    const info = CALCULATOR_VERSIONS.kfre;
    return {
        modelName: info.name,
        modelVersion: info.version,
        reference: info.reference,
        applicablePopulation: info.applicablePopulation,
        calculatedAt: new Date().toISOString(),
        inputsUsed: { ...input },
        limitations: [
            'Validated primarily for eGFR 3-59 mL/min/1.73m² (CKD stages 3-5)',
            'Less accurate for rapidly progressing kidney disease',
            'Does not account for specific causes of CKD',
            'Original model developed in Canadian and international cohorts',
            'Performance may vary in certain ethnic groups',
        ],
    };
}
