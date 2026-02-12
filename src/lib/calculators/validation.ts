// ============================================================
// Input Validation Engine
// ============================================================
import { VALIDATION_RANGES } from '../constants';
import type { PatientData, ClinicalData, ValidationError } from '../types';

export function validatePatient(patient: PatientData, lang: 'pt-BR' | 'en-US' = 'pt-BR'): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!patient.name || patient.name.trim().length < 2) {
        errors.push({
            field: 'name',
            message: 'Patient name is required (min 2 characters)',
            messagePtBR: 'Nome do paciente é obrigatório (mínimo 2 caracteres)',
        });
    }

    if (!patient.age || patient.age < 18 || patient.age > 120) {
        errors.push({
            field: 'age',
            message: `Age must be between ${VALIDATION_RANGES.age.min} and ${VALIDATION_RANGES.age.max}`,
            messagePtBR: `Idade deve estar entre ${VALIDATION_RANGES.age.min} e ${VALIDATION_RANGES.age.max} anos`,
        });
    }

    if (!patient.sex || !['male', 'female'].includes(patient.sex)) {
        errors.push({
            field: 'sex',
            message: 'Sex is required (male/female)',
            messagePtBR: 'Sexo é obrigatório (masculino/feminino)',
        });
    }

    return errors;
}

export function validateClinicalData(data: ClinicalData, lang: 'pt-BR' | 'en-US' = 'pt-BR'): ValidationError[] {
    const errors: ValidationError[] = [];

    const rangeChecks: { field: keyof ClinicalData; required: boolean }[] = [
        { field: 'systolicBP', required: true },
        { field: 'diastolicBP', required: true },
        { field: 'totalCholesterol', required: true },
        { field: 'hdlCholesterol', required: true },
        { field: 'serumCreatinine', required: true },
        { field: 'ldlCholesterol', required: false },
        { field: 'triglycerides', required: false },
        { field: 'eGFR', required: false },
        { field: 'acr', required: false },
        { field: 'hba1c', required: false },
        { field: 'potassium', required: false },
        { field: 'sodium', required: false },
        { field: 'calcium', required: false },
        { field: 'phosphorus', required: false },
    ];

    for (const check of rangeChecks) {
        const value = data[check.field];
        const range = VALIDATION_RANGES[check.field];

        if (range && value !== undefined && value !== null && typeof value === 'number') {
            if (value < range.min || value > range.max) {
                errors.push({
                    field: check.field,
                    message: `${check.field} must be between ${range.min} and ${range.max} ${range.unit}`,
                    messagePtBR: `${check.field} deve estar entre ${range.min} e ${range.max} ${range.unit}`,
                });
            }
        } else if (check.required && (value === undefined || value === null)) {
            errors.push({
                field: check.field,
                message: `${check.field} is required`,
                messagePtBR: `${check.field} é obrigatório`,
            });
        }
    }

    // Cross-field validations
    if (data.systolicBP && data.diastolicBP && data.systolicBP <= data.diastolicBP) {
        errors.push({
            field: 'systolicBP',
            message: 'Systolic BP must be greater than diastolic BP',
            messagePtBR: 'PAS deve ser maior que PAD',
        });
    }

    return errors;
}

export function getRequiredFieldsForModel(model: string): string[] {
    switch (model) {
        case 'ascvd':
            return ['age', 'sex', 'ethnicity', 'totalCholesterol', 'hdlCholesterol', 'systolicBP', 'onBPMedication', 'hasDiabetes', 'isSmoker'];
        case 'framingham':
            return ['age', 'sex', 'totalCholesterol', 'hdlCholesterol', 'systolicBP', 'onBPMedication', 'hasDiabetes', 'isSmoker'];
        case 'score2':
            return ['age', 'sex', 'totalCholesterol', 'hdlCholesterol', 'systolicBP', 'isSmoker'];
        case 'kdigo':
            return ['serumCreatinine', 'age', 'sex'];
        case 'kfre':
            return ['age', 'sex', 'eGFR', 'acr'];
        default:
            return [];
    }
}
