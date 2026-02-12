// ============================================================
// CardioRenal Risk Report – Core Type Definitions
// ============================================================

// --- Patient & Demographics ---
export interface PatientData {
    id?: string;
    externalId?: string;
    name: string;
    age: number;
    sex: 'male' | 'female';
    ethnicity?: 'white' | 'black' | 'hispanic' | 'asian' | 'other';
    heightCm?: number;
    weightKg?: number;
}

// --- Clinical Inputs ---
export interface ClinicalData {
    // Vitals
    systolicBP: number;
    diastolicBP: number;
    onBPMedication: boolean;

    // Diabetes
    hasDiabetes: boolean;
    hba1c?: number;

    // Smoking
    isSmoker: boolean;

    // Lipids (mg/dL)
    totalCholesterol: number;
    hdlCholesterol: number;
    ldlCholesterol?: number;
    triglycerides?: number;

    // Renal
    serumCreatinine: number; // mg/dL
    eGFR?: number; // mL/min/1.73m² (calculated or provided)
    urea?: number;
    acr?: number; // mg/g (albumin-creatinine ratio)
    proteinuria?: number;

    // Electrolytes (advanced)
    potassium?: number;
    bicarbonate?: number;
    sodium?: number;
    calcium?: number;
    phosphorus?: number;
    pth?: number;
    vitaminD?: number;

    // History
    hasHeartFailure?: boolean;
    hasCAD?: boolean;
    hasStroke?: boolean;
    hasCKD?: boolean;
    hasTransplant?: boolean;
    hasNephropathy?: boolean;
    hasArrhythmia?: boolean;

    // Medications
    onACEIorARB?: boolean;
    onSGLT2?: boolean;
    onStatin?: boolean;
    onDiuretic?: boolean;
    onBetaBlocker?: boolean;

    // Notes
    signsSymptoms?: string;
    findings?: string;
}

// --- Assessment (full input bundle) ---
export interface AssessmentInput {
    patient: PatientData;
    clinical: ClinicalData;
    language: 'pt-BR' | 'en-US';
    calculatorPreferences?: {
        cardiac?: 'ascvd' | 'framingham' | 'score2' | 'auto';
        renal?: 'kdigo' | 'kfre' | 'auto';
    };
}

// --- Calculator Result Types ---
export type RiskClassification = 'low' | 'moderate' | 'high' | 'very_high';

export interface CalculatorMetadata {
    modelName: string;
    modelVersion: string;
    reference: string;
    applicablePopulation: string;
    calculatedAt: string;
    inputsUsed: Record<string, unknown>;
    limitations: string[];
}

export interface CardiacResult {
    id: string;
    modelUsed: 'ascvd' | 'framingham' | 'score2';
    risk5yPercent: number | null;
    risk10yPercent: number;
    classification: RiskClassification;
    classificationJustification: string;
    contributingFactors: ContributingFactor[];
    metadata: CalculatorMetadata;
}

export interface ContributingFactor {
    factor: string;
    impact: 'high' | 'moderate' | 'low';
    description: string;
    modifiable: boolean;
}

export type GFRStage = 'G1' | 'G2' | 'G3a' | 'G3b' | 'G4' | 'G5';
export type AlbuminuriaStage = 'A1' | 'A2' | 'A3';

export interface RenalResult {
    id: string;
    modelUsed: 'kdigo' | 'kfre' | 'ckd-epi';
    eGFRCalculated: number;
    gfrStage: GFRStage;
    albuminuriaStage: AlbuminuriaStage;
    riskCategory: RiskClassification;
    kfre2yPercent: number | null;
    kfre5yPercent: number | null;
    contributingFactors: ContributingFactor[];
    metadata: CalculatorMetadata;
}

// --- AI Interpretation ---
export interface AIInterpretation {
    id: string;
    promptVersion: string;
    language: 'pt-BR' | 'en-US';
    clinicalSummary: string;
    laySummary: string;
    topFactors: { factor: string; explanation: string }[];
    recommendations: string[];
    redFlags: { flag: string; severity: 'warning' | 'critical'; action: string }[];
    limitations: string[];
    generatedAt: string;
}

// --- Full Assessment Result ---
export interface AssessmentResult {
    id: string;
    patientId: string;
    assessmentDate: string;
    cardiacResult: CardiacResult;
    renalResult: RenalResult;
    aiInterpretation?: AIInterpretation;
    version: string;
}

// --- Validation ---
export interface ValidationRule {
    field: string;
    min: number;
    max: number;
    unit: string;
    required: boolean;
    label: string;
    labelPtBR: string;
}

export interface ValidationError {
    field: string;
    message: string;
    messagePtBR: string;
}

// --- Audit ---
export interface AuditEntry {
    id: string;
    userId: string;
    action: 'calculate' | 'generate_pdf' | 'login' | 'view' | 'create' | 'update';
    entityType: string;
    entityId: string;
    details: Record<string, unknown>;
    timestamp: string;
}
