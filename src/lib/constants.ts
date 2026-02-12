// ============================================================
// CardioRenal Risk Report – App Constants & Disclaimers
// ============================================================

export const APP_VERSION = '1.0.0-mvp';

export const DISCLAIMER = {
    'pt-BR': `⚠️ AVISO IMPORTANTE: Este relatório é uma ferramenta de apoio à decisão clínica e NÃO constitui diagnóstico médico. Não substitui a avaliação presencial por um profissional de saúde qualificado. Os resultados são baseados em modelos populacionais e podem não refletir o risco individual exato. Use seu julgamento clínico. Em caso de emergência, procure atendimento imediato.`,
    'en-US': `⚠️ IMPORTANT NOTICE: This report is a clinical decision support tool and does NOT constitute a medical diagnosis. It does not replace in-person evaluation by a qualified healthcare professional. Results are based on population models and may not reflect exact individual risk. Use clinical judgment. In case of emergency, seek immediate care.`,
};

export const DISCLAIMER_SHORT = {
    'pt-BR': 'Ferramenta de apoio à decisão clínica. Não substitui consulta médica.',
    'en-US': 'Clinical decision support tool. Does not replace medical consultation.',
};

export const CALCULATOR_VERSIONS = {
    ascvd: {
        version: '2013-PCE-v1.0',
        name: 'Pooled Cohort Equations (ASCVD)',
        reference: 'Goff DC Jr, et al. 2013 ACC/AHA Guideline on the Assessment of Cardiovascular Risk. Circulation. 2014;129(suppl 2):S49-S73.',
        year: 2013,
        applicablePopulation: 'Adults aged 40-79, non-Hispanic white or African American',
    },
    framingham: {
        version: 'FRS-2008-v1.0',
        name: 'Framingham Risk Score',
        reference: 'D\'Agostino RB Sr, et al. General cardiovascular risk profile for use in primary care: the Framingham Heart Study. Circulation. 2008;117(6):743-753.',
        year: 2008,
        applicablePopulation: 'Adults aged 30-74',
    },
    score2: {
        version: 'SCORE2-2021-v1.0',
        name: 'SCORE2 (Systematic COronary Risk Evaluation 2)',
        reference: 'SCORE2 working group. SCORE2 risk prediction algorithms: new models to estimate 10-year risk of cardiovascular disease in Europe. Eur Heart J. 2021;42(25):2439-2454.',
        year: 2021,
        applicablePopulation: 'Adults aged 40-69, European populations',
    },
    'ckd-epi': {
        version: 'CKD-EPI-2021-v1.0',
        name: 'CKD-EPI 2021 (Race-Free)',
        reference: 'Inker LA, et al. New Creatinine- and Cystatin C-Based Equations to Estimate GFR without Race. N Engl J Med. 2021;385(19):1737-1749.',
        year: 2021,
        applicablePopulation: 'Adults aged 18+',
    },
    kdigo: {
        version: 'KDIGO-2012-v1.0',
        name: 'KDIGO CKD Classification',
        reference: 'KDIGO 2012 Clinical Practice Guideline for the Evaluation and Management of Chronic Kidney Disease. Kidney Int Suppl. 2013;3:1-150.',
        year: 2012,
        applicablePopulation: 'All patients with suspected or confirmed CKD',
    },
    kfre: {
        version: 'KFRE-2016-v1.0',
        name: 'Kidney Failure Risk Equation',
        reference: 'Tangri N, et al. Multinational Assessment of Accuracy of Equations for Predicting Risk of Kidney Failure. JAMA. 2016;315(2):164-174.',
        year: 2016,
        applicablePopulation: 'Adults with eGFR 3-59 mL/min/1.73m², CKD stages 3-5',
    },
};

export const RISK_COLORS = {
    low: { bg: '#10B981', text: '#065F46', label: { 'pt-BR': 'Baixo', 'en-US': 'Low' } },
    moderate: { bg: '#F59E0B', text: '#92400E', label: { 'pt-BR': 'Moderado', 'en-US': 'Moderate' } },
    high: { bg: '#EF4444', text: '#991B1B', label: { 'pt-BR': 'Alto', 'en-US': 'High' } },
    very_high: { bg: '#7C3AED', text: '#4C1D95', label: { 'pt-BR': 'Muito Alto', 'en-US': 'Very High' } },
};

export const VALIDATION_RANGES: Record<string, { min: number; max: number; unit: string }> = {
    age: { min: 18, max: 120, unit: 'anos' },
    systolicBP: { min: 50, max: 300, unit: 'mmHg' },
    diastolicBP: { min: 30, max: 200, unit: 'mmHg' },
    totalCholesterol: { min: 50, max: 500, unit: 'mg/dL' },
    hdlCholesterol: { min: 10, max: 150, unit: 'mg/dL' },
    ldlCholesterol: { min: 20, max: 400, unit: 'mg/dL' },
    triglycerides: { min: 20, max: 2000, unit: 'mg/dL' },
    serumCreatinine: { min: 0.1, max: 30, unit: 'mg/dL' },
    eGFR: { min: 1, max: 200, unit: 'mL/min/1.73m²' },
    acr: { min: 0, max: 30000, unit: 'mg/g' },
    hba1c: { min: 3, max: 20, unit: '%' },
    potassium: { min: 1, max: 10, unit: 'mEq/L' },
    sodium: { min: 100, max: 180, unit: 'mEq/L' },
    calcium: { min: 4, max: 18, unit: 'mg/dL' },
    phosphorus: { min: 1, max: 15, unit: 'mg/dL' },
    heightCm: { min: 50, max: 250, unit: 'cm' },
    weightKg: { min: 10, max: 400, unit: 'kg' },
};

export const DEMO_CREDENTIALS = {
    admin: { email: 'admin@cardiorenal.app', password: 'admin123', name: 'Dr. Admin', role: 'admin' as const },
    clinician: { email: 'medico@cardiorenal.app', password: 'medico123', name: 'Dr. Silva', role: 'clinician' as const },
};
