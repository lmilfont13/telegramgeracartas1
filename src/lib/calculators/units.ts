// ============================================================
// Unit Conversion Utilities
// ============================================================

/**
 * Convert cholesterol from mg/dL to mmol/L
 * Factor: 1 mg/dL = 0.02586 mmol/L
 */
export function cholesterolToMmol(mgDl: number): number {
    return Math.round(mgDl * 0.02586 * 100) / 100;
}

/**
 * Convert cholesterol from mmol/L to mg/dL
 */
export function cholesterolToMgDl(mmolL: number): number {
    return Math.round(mmolL / 0.02586 * 10) / 10;
}

/**
 * Convert creatinine from mg/dL to µmol/L
 * Factor: 1 mg/dL = 88.42 µmol/L
 */
export function creatinineToUmol(mgDl: number): number {
    return Math.round(mgDl * 88.42 * 10) / 10;
}

/**
 * Convert creatinine from µmol/L to mg/dL
 */
export function creatinineToMgDl(umolL: number): number {
    return Math.round(umolL / 88.42 * 100) / 100;
}

/**
 * Convert glucose from mg/dL to mmol/L
 * Factor: 1 mg/dL = 0.0555 mmol/L
 */
export function glucoseToMmol(mgDl: number): number {
    return Math.round(mgDl * 0.0555 * 100) / 100;
}

/**
 * Convert glucose from mmol/L to mg/dL
 */
export function glucoseToMgDl(mmolL: number): number {
    return Math.round(mmolL / 0.0555 * 10) / 10;
}

/**
 * Convert triglycerides from mg/dL to mmol/L
 * Factor: 1 mg/dL = 0.01129 mmol/L
 */
export function triglyceridesToMmol(mgDl: number): number {
    return Math.round(mgDl * 0.01129 * 100) / 100;
}

/**
 * Convert triglycerides from mmol/L to mg/dL
 */
export function triglyceridesToMgDl(mmolL: number): number {
    return Math.round(mmolL / 0.01129 * 10) / 10;
}

/**
 * Calculate BMI from height (cm) and weight (kg)
 */
export function calculateBMI(heightCm: number, weightKg: number): number {
    const heightM = heightCm / 100;
    return Math.round((weightKg / (heightM * heightM)) * 10) / 10;
}
