// ============================================================
// ASCVD 10-Year Risk Calculator (Pooled Cohort Equations)
// Reference: Goff DC Jr, et al. Circulation. 2014;129(suppl 2):S49-S73.
// ============================================================
import type { CardiacResult, ContributingFactor, RiskClassification } from '../types';
import { CALCULATOR_VERSIONS } from '../constants';
import { v4 as uuidv4 } from 'uuid';

interface ASCVDInput {
    age: number;
    sex: 'male' | 'female';
    race: 'white' | 'black' | 'other';
    totalCholesterol: number; // mg/dL
    hdlCholesterol: number; // mg/dL
    systolicBP: number; // mmHg
    onBPMedication: boolean;
    hasDiabetes: boolean;
    isSmoker: boolean;
}

// Pooled Cohort Equations coefficients
// Format: [lnAge, lnAge², lnTC, lnAge×lnTC, lnHDL, lnAge×lnHDL, lnTreatedSBP, lnAge×lnTreatedSBP, lnUntreatedSBP, lnAge×lnUntreatedSBP, smoker, smoker×lnAge, diabetes, meanCoeffSum, baselineSurvival]
const COEFFICIENTS = {
    white_female: {
        lnAge: -29.799,
        lnAge2: 4.884,
        lnTC: 13.540,
        lnAge_lnTC: -3.114,
        lnHDL: -13.578,
        lnAge_lnHDL: 3.149,
        lnTreatedSBP: 2.019,
        lnAge_lnTreatedSBP: 0,
        lnUntreatedSBP: 1.957,
        lnAge_lnUntreatedSBP: 0,
        smoker: 7.574,
        smoker_lnAge: -1.665,
        diabetes: 0.661,
        meanCoeff: -29.18,
        baselineSurvival: 0.9665,
    },
    black_female: {
        lnAge: 17.114,
        lnAge2: 0,
        lnTC: 0.940,
        lnAge_lnTC: 0,
        lnHDL: -18.920,
        lnAge_lnHDL: 4.475,
        lnTreatedSBP: 29.291,
        lnAge_lnTreatedSBP: -6.432,
        lnUntreatedSBP: 27.820,
        lnAge_lnUntreatedSBP: -6.087,
        smoker: 0.691,
        smoker_lnAge: 0,
        diabetes: 0.874,
        meanCoeff: 86.61,
        baselineSurvival: 0.9533,
    },
    white_male: {
        lnAge: 12.344,
        lnAge2: 0,
        lnTC: 11.853,
        lnAge_lnTC: -2.664,
        lnHDL: -7.990,
        lnAge_lnHDL: 1.769,
        lnTreatedSBP: 1.797,
        lnAge_lnTreatedSBP: 0,
        lnUntreatedSBP: 1.764,
        lnAge_lnUntreatedSBP: 0,
        smoker: 7.837,
        smoker_lnAge: -1.795,
        diabetes: 0.658,
        meanCoeff: 61.18,
        baselineSurvival: 0.9144,
    },
    black_male: {
        lnAge: 2.469,
        lnAge2: 0,
        lnTC: 0.302,
        lnAge_lnTC: 0,
        lnHDL: -0.307,
        lnAge_lnHDL: 0,
        lnTreatedSBP: 1.916,
        lnAge_lnTreatedSBP: 0,
        lnUntreatedSBP: 1.809,
        lnAge_lnUntreatedSBP: 0,
        smoker: 0.549,
        smoker_lnAge: 0,
        diabetes: 0.645,
        meanCoeff: 19.54,
        baselineSurvival: 0.8954,
    },
};

function getCoeffKey(sex: 'male' | 'female', race: 'white' | 'black' | 'other'): keyof typeof COEFFICIENTS {
    const raceKey = race === 'black' ? 'black' : 'white';
    return `${raceKey}_${sex}` as keyof typeof COEFFICIENTS;
}

/**
 * Calculate 10-year ASCVD risk using the Pooled Cohort Equations
 */
export function calculateASCVD(input: ASCVDInput): CardiacResult {
    const { age, sex, race, totalCholesterol, hdlCholesterol, systolicBP, onBPMedication, hasDiabetes, isSmoker } = input;

    const coeffKey = getCoeffKey(sex, race);
    const c = COEFFICIENTS[coeffKey];

    const lnAge = Math.log(age);
    const lnTC = Math.log(totalCholesterol);
    const lnHDL = Math.log(hdlCholesterol);
    const lnSBP = Math.log(systolicBP);

    let individualSum = 0;
    individualSum += c.lnAge * lnAge;
    individualSum += c.lnAge2 * lnAge * lnAge;
    individualSum += c.lnTC * lnTC;
    individualSum += c.lnAge_lnTC * lnAge * lnTC;
    individualSum += c.lnHDL * lnHDL;
    individualSum += c.lnAge_lnHDL * lnAge * lnHDL;

    if (onBPMedication) {
        individualSum += c.lnTreatedSBP * lnSBP;
        individualSum += c.lnAge_lnTreatedSBP * lnAge * lnSBP;
    } else {
        individualSum += c.lnUntreatedSBP * lnSBP;
        individualSum += c.lnAge_lnUntreatedSBP * lnAge * lnSBP;
    }

    if (isSmoker) {
        individualSum += c.smoker;
        individualSum += c.smoker_lnAge * lnAge;
    }

    if (hasDiabetes) {
        individualSum += c.diabetes;
    }

    const risk10y = 1 - Math.pow(c.baselineSurvival, Math.exp(individualSum - c.meanCoeff));
    const risk10yPercent = Math.round(Math.max(0, Math.min(100, risk10y * 100)) * 10) / 10;

    // Estimate 5-year risk (approximate: not all models provide this directly)
    const risk5yPercent = Math.round(risk10yPercent * 0.55 * 10) / 10; // ~55% of 10-year risk

    const classification = classifyCardiacRisk(risk10yPercent);
    const factors = identifyContributingFactors(input, risk10yPercent);

    const info = CALCULATOR_VERSIONS.ascvd;

    return {
        id: uuidv4(),
        modelUsed: 'ascvd',
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
                'Developed primarily in US non-Hispanic white and African American populations',
                'May overestimate risk in some populations (e.g., Hispanic, East Asian)',
                'Not validated for ages < 40 or > 79',
                'Does not account for family history, CRP, coronary calcium score, or other risk enhancers',
            ],
        },
    };
}

function classifyCardiacRisk(risk10y: number): { level: RiskClassification; justification: string } {
    if (risk10y < 5) {
        return { level: 'low', justification: `Risco ASCVD 10 anos de ${risk10y}% (< 5%). Risco baixo conforme ACC/AHA 2019.` };
    } else if (risk10y < 7.5) {
        return { level: 'moderate', justification: `Risco ASCVD 10 anos de ${risk10y}% (5-7.4%). Risco limítrofe/moderado. Considerar fatores de risco adicional.` };
    } else if (risk10y < 20) {
        return { level: 'high', justification: `Risco ASCVD 10 anos de ${risk10y}% (7.5-19.9%). Risco intermediário a alto. Discussão sobre terapia com estatina e mudanças de estilo de vida.` };
    } else {
        return { level: 'very_high', justification: `Risco ASCVD 10 anos de ${risk10y}% (≥ 20%). Risco muito alto. Indicação de terapia intensiva com estatina e manejo agressivo de fatores de risco.` };
    }
}

function identifyContributingFactors(input: ASCVDInput, riskPercent: number): ContributingFactor[] {
    const factors: ContributingFactor[] = [];

    if (input.age >= 65) {
        factors.push({ factor: 'Idade avançada', impact: 'high', description: `Idade de ${input.age} anos aumenta significativamente o risco cardiovascular`, modifiable: false });
    } else if (input.age >= 55) {
        factors.push({ factor: 'Idade', impact: 'moderate', description: `Idade de ${input.age} anos contribui para o risco`, modifiable: false });
    }

    if (input.systolicBP >= 140) {
        factors.push({ factor: 'Hipertensão', impact: 'high', description: `PA sistólica de ${input.systolicBP} mmHg acima do alvo (< 130-140 mmHg)`, modifiable: true });
    } else if (input.systolicBP >= 130) {
        factors.push({ factor: 'Pressão arterial elevada', impact: 'moderate', description: `PA sistólica de ${input.systolicBP} mmHg moderadamente elevada`, modifiable: true });
    }

    if (input.totalCholesterol >= 240) {
        factors.push({ factor: 'Colesterol total elevado', impact: 'high', description: `Colesterol total de ${input.totalCholesterol} mg/dL (desejável < 200 mg/dL)`, modifiable: true });
    } else if (input.totalCholesterol >= 200) {
        factors.push({ factor: 'Colesterol total limítrofe', impact: 'moderate', description: `Colesterol total de ${input.totalCholesterol} mg/dL (limítrofe-alto)`, modifiable: true });
    }

    if (input.hdlCholesterol < 40) {
        factors.push({ factor: 'HDL baixo', impact: 'high', description: `HDL de ${input.hdlCholesterol} mg/dL (< 40 mg/dL) é fator de risco independente`, modifiable: true });
    } else if (input.hdlCholesterol < 50 && input.sex === 'female') {
        factors.push({ factor: 'HDL baixo', impact: 'moderate', description: `HDL de ${input.hdlCholesterol} mg/dL (< 50 mg/dL para mulheres)`, modifiable: true });
    }

    if (input.hasDiabetes) {
        factors.push({ factor: 'Diabetes mellitus', impact: 'high', description: 'Diabetes é um equivalente de risco cardiovascular', modifiable: true });
    }

    if (input.isSmoker) {
        factors.push({ factor: 'Tabagismo', impact: 'high', description: 'Tabagismo ativo dobra aproximadamente o risco cardiovascular', modifiable: true });
    }

    return factors.sort((a, b) => {
        const order = { high: 0, moderate: 1, low: 2 };
        return order[a.impact] - order[b.impact];
    });
}

/**
 * Check if ASCVD calculator is applicable for the given patient
 */
export function isASCVDApplicable(age: number, ethnicity?: string): boolean {
    return age >= 40 && age <= 79;
}
