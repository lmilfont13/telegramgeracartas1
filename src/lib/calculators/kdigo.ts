// ============================================================
// KDIGO CKD Staging & Risk Classification
// Reference: KDIGO 2012 Clinical Practice Guideline. Kidney Int Suppl. 2013;3:1-150.
// ============================================================
import type { GFRStage, AlbuminuriaStage, RiskClassification } from '../types';
import { CALCULATOR_VERSIONS } from '../constants';

export interface KDIGOInput {
    eGFR: number; // mL/min/1.73m²
    acr?: number; // mg/g (albumin-creatinine ratio)
}

/**
 * Classify GFR stage based on eGFR value
 */
export function getGFRStage(eGFR: number): GFRStage {
    if (eGFR >= 90) return 'G1';
    if (eGFR >= 60) return 'G2';
    if (eGFR >= 45) return 'G3a';
    if (eGFR >= 30) return 'G3b';
    if (eGFR >= 15) return 'G4';
    return 'G5';
}

/**
 * Classify albuminuria stage based on ACR
 */
export function getAlbuminuriaStage(acr: number | undefined): AlbuminuriaStage {
    if (!acr || acr < 30) return 'A1';
    if (acr < 300) return 'A2';
    return 'A3';
}

/**
 * KDIGO CKD Risk Matrix
 * Returns risk classification based on GFR and Albuminuria stages
 */
const RISK_MATRIX: Record<GFRStage, Record<AlbuminuriaStage, RiskClassification>> = {
    G1: { A1: 'low', A2: 'moderate', A3: 'high' },
    G2: { A1: 'low', A2: 'moderate', A3: 'high' },
    G3a: { A1: 'moderate', A2: 'high', A3: 'very_high' },
    G3b: { A1: 'high', A2: 'very_high', A3: 'very_high' },
    G4: { A1: 'very_high', A2: 'very_high', A3: 'very_high' },
    G5: { A1: 'very_high', A2: 'very_high', A3: 'very_high' },
};

export function getKDIGORisk(gfrStage: GFRStage, albuminuriaStage: AlbuminuriaStage): RiskClassification {
    return RISK_MATRIX[gfrStage][albuminuriaStage];
}

export function getGFRStageLabel(stage: GFRStage): { label: string; description: string; descriptionPtBR: string; range: string } {
    const stages: Record<GFRStage, { label: string; description: string; descriptionPtBR: string; range: string }> = {
        G1: { label: 'G1', description: 'Normal or high', descriptionPtBR: 'Normal ou elevado', range: '≥ 90' },
        G2: { label: 'G2', description: 'Mildly decreased', descriptionPtBR: 'Levemente reduzido', range: '60-89' },
        G3a: { label: 'G3a', description: 'Mildly to moderately decreased', descriptionPtBR: 'Leve a moderadamente reduzido', range: '45-59' },
        G3b: { label: 'G3b', description: 'Moderately to severely decreased', descriptionPtBR: 'Moderada a gravemente reduzido', range: '30-44' },
        G4: { label: 'G4', description: 'Severely decreased', descriptionPtBR: 'Gravemente reduzido', range: '15-29' },
        G5: { label: 'G5', description: 'Kidney failure', descriptionPtBR: 'Insuficiência renal', range: '< 15' },
    };
    return stages[stage];
}

export function getAlbuminuriaStageLabel(stage: AlbuminuriaStage): { label: string; description: string; descriptionPtBR: string; range: string } {
    const stages: Record<AlbuminuriaStage, { label: string; description: string; descriptionPtBR: string; range: string }> = {
        A1: { label: 'A1', description: 'Normal to mildly increased', descriptionPtBR: 'Normal a levemente aumentada', range: '< 30' },
        A2: { label: 'A2', description: 'Moderately increased', descriptionPtBR: 'Moderadamente aumentada', range: '30-300' },
        A3: { label: 'A3', description: 'Severely increased', descriptionPtBR: 'Gravemente aumentada', range: '> 300' },
    };
    return stages[stage];
}

/**
 * Get monitoring frequency recommendation based on KDIGO risk
 */
export function getMonitoringFrequency(risk: RiskClassification): string {
    switch (risk) {
        case 'low': return 'Monitoramento anual (se outros fatores de risco presentes)';
        case 'moderate': return 'Monitoramento anual';
        case 'high': return 'Monitoramento a cada 6 meses';
        case 'very_high': return 'Monitoramento a cada 3-4 meses; encaminhar a nefrologista';
    }
}

export function getKDIGOMetadata(input: KDIGOInput) {
    const info = CALCULATOR_VERSIONS.kdigo;
    return {
        modelName: info.name,
        modelVersion: info.version,
        reference: info.reference,
        applicablePopulation: info.applicablePopulation,
        calculatedAt: new Date().toISOString(),
        inputsUsed: { ...input },
        limitations: [
            'Staging requires persistence ≥ 3 months for CKD diagnosis',
            'Single measurement may not reflect chronic kidney disease',
            'ACR from spot urine may vary; consider confirming with repeat testing',
        ],
    };
}
