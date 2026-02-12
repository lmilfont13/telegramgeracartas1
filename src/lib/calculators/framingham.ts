// ============================================================
// Framingham Risk Score Calculator
// Reference: D'Agostino RB Sr, et al. Circulation. 2008;117(6):743-753.
// ============================================================
import type { CardiacResult, ContributingFactor, RiskClassification } from '../types';
import { CALCULATOR_VERSIONS } from '../constants';
import { v4 as uuidv4 } from 'uuid';

interface FraminghamInput {
    age: number;
    sex: 'male' | 'female';
    totalCholesterol: number;
    hdlCholesterol: number;
    systolicBP: number;
    onBPMedication: boolean;
    hasDiabetes: boolean;
    isSmoker: boolean;
}

// Point-based Framingham Risk Score tables
function getAgePoints(age: number, sex: 'male' | 'female'): number {
    if (sex === 'male') {
        if (age <= 34) return -9;
        if (age <= 39) return -4;
        if (age <= 44) return 0;
        if (age <= 49) return 3;
        if (age <= 54) return 6;
        if (age <= 59) return 8;
        if (age <= 64) return 10;
        if (age <= 69) return 11;
        if (age <= 74) return 12;
        return 13;
    } else {
        if (age <= 34) return -7;
        if (age <= 39) return -3;
        if (age <= 44) return 0;
        if (age <= 49) return 3;
        if (age <= 54) return 6;
        if (age <= 59) return 8;
        if (age <= 64) return 10;
        if (age <= 69) return 12;
        if (age <= 74) return 14;
        return 16;
    }
}

function getTCPoints(tc: number, sex: 'male' | 'female'): number {
    if (sex === 'male') {
        if (tc < 160) return 0;
        if (tc <= 199) return 1;
        if (tc <= 239) return 2;
        if (tc <= 279) return 3;
        return 4;
    } else {
        if (tc < 160) return 0;
        if (tc <= 199) return 1;
        if (tc <= 239) return 3;
        if (tc <= 279) return 4;
        return 5;
    }
}

function getHDLPoints(hdl: number): number {
    if (hdl >= 60) return -1;
    if (hdl >= 50) return 0;
    if (hdl >= 40) return 1;
    return 2;
}

function getSBPPoints(sbp: number, treated: boolean, sex: 'male' | 'female'): number {
    if (sex === 'male') {
        if (!treated) {
            if (sbp < 120) return 0;
            if (sbp <= 129) return 0;
            if (sbp <= 139) return 1;
            if (sbp <= 159) return 1;
            return 2;
        } else {
            if (sbp < 120) return 0;
            if (sbp <= 129) return 1;
            if (sbp <= 139) return 2;
            if (sbp <= 159) return 2;
            return 3;
        }
    } else {
        if (!treated) {
            if (sbp < 120) return 0;
            if (sbp <= 129) return 1;
            if (sbp <= 139) return 2;
            if (sbp <= 159) return 3;
            return 4;
        } else {
            if (sbp < 120) return 0;
            if (sbp <= 129) return 3;
            if (sbp <= 139) return 4;
            if (sbp <= 159) return 5;
            return 6;
        }
    }
}

// 10-year risk lookup by total points
function getRisk10y(points: number, sex: 'male' | 'female'): number {
    if (sex === 'male') {
        if (points <= 0) return 1;
        const riskTable: Record<number, number> = {
            1: 1, 2: 1, 3: 1, 4: 1, 5: 2, 6: 2, 7: 3, 8: 4,
            9: 5, 10: 6, 11: 8, 12: 10, 13: 12, 14: 16, 15: 20, 16: 25,
        };
        if (points >= 17) return 30;
        return riskTable[points] || 1;
    } else {
        if (points <= 8) return 1;
        const riskTable: Record<number, number> = {
            9: 1, 10: 1, 11: 1, 12: 1, 13: 2, 14: 2, 15: 3, 16: 4,
            17: 5, 18: 6, 19: 8, 20: 11, 21: 14, 22: 17, 23: 22, 24: 27,
        };
        if (points >= 25) return 30;
        return riskTable[points] || 1;
    }
}

export function calculateFramingham(input: FraminghamInput): CardiacResult {
    let totalPoints = 0;

    totalPoints += getAgePoints(input.age, input.sex);
    totalPoints += getTCPoints(input.totalCholesterol, input.sex);
    totalPoints += getHDLPoints(input.hdlCholesterol);
    totalPoints += getSBPPoints(input.systolicBP, input.onBPMedication, input.sex);

    if (input.isSmoker) {
        totalPoints += input.sex === 'male' ? 2 : 2;
    }
    if (input.hasDiabetes) {
        totalPoints += input.sex === 'male' ? 2 : 4;
    }

    const risk10y = getRisk10y(totalPoints, input.sex);
    const risk5y = Math.round(risk10y * 0.55 * 10) / 10;

    const classification = classifyRisk(risk10y);
    const factors = getFactors(input);

    const info = CALCULATOR_VERSIONS.framingham;

    return {
        id: uuidv4(),
        modelUsed: 'framingham',
        risk5yPercent: risk5y,
        risk10yPercent: risk10y,
        classification: classification.level,
        classificationJustification: classification.justification,
        contributingFactors: factors,
        metadata: {
            modelName: info.name,
            modelVersion: info.version,
            reference: info.reference,
            applicablePopulation: info.applicablePopulation,
            calculatedAt: new Date().toISOString(),
            inputsUsed: { ...input, totalPoints },
            limitations: [
                'Based on Framingham, MA population (primarily white Americans)',
                'May overestimate risk in low-risk populations',
                'May underestimate risk in South Asian and some Hispanic populations',
                'Valid for ages 30-74',
            ],
        },
    };
}

function classifyRisk(risk: number): { level: RiskClassification; justification: string } {
    if (risk < 10) return { level: 'low', justification: `Risco Framingham de ${risk}% em 10 anos (< 10%). Baixo risco.` };
    if (risk < 20) return { level: 'moderate', justification: `Risco Framingham de ${risk}% em 10 anos (10-19%). Risco moderado.` };
    return { level: 'high', justification: `Risco Framingham de ${risk}% em 10 anos (≥ 20%). Alto risco.` };
}

function getFactors(input: FraminghamInput): ContributingFactor[] {
    const factors: ContributingFactor[] = [];
    if (input.isSmoker) factors.push({ factor: 'Tabagismo', impact: 'high', description: 'Tabagismo ativo', modifiable: true });
    if (input.hasDiabetes) factors.push({ factor: 'Diabetes', impact: 'high', description: 'Diabetes mellitus', modifiable: true });
    if (input.systolicBP >= 140) factors.push({ factor: 'Hipertensão', impact: 'high', description: `PAS ${input.systolicBP} mmHg`, modifiable: true });
    if (input.totalCholesterol >= 240) factors.push({ factor: 'Colesterol elevado', impact: 'moderate', description: `CT ${input.totalCholesterol} mg/dL`, modifiable: true });
    if (input.hdlCholesterol < 40) factors.push({ factor: 'HDL baixo', impact: 'moderate', description: `HDL ${input.hdlCholesterol} mg/dL`, modifiable: true });
    if (input.age >= 55) factors.push({ factor: 'Idade', impact: 'moderate', description: `${input.age} anos`, modifiable: false });
    return factors;
}

export function isFraminghamApplicable(age: number): boolean {
    return age >= 30 && age <= 74;
}
