'use client';
import { useState } from 'react';
import type { PatientData, ClinicalData } from '@/lib/types';

interface Props {
    onSubmit: (patient: PatientData, clinical: ClinicalData) => void;
    onCancel: () => void;
}

const defaultPatient: PatientData = {
    name: '', age: 55, sex: 'male', ethnicity: 'white', heightCm: 170, weightKg: 80,
};

const defaultClinical: ClinicalData = {
    systolicBP: 130, diastolicBP: 80, onBPMedication: false,
    hasDiabetes: false, isSmoker: false,
    totalCholesterol: 200, hdlCholesterol: 50, ldlCholesterol: 120, triglycerides: 150,
    serumCreatinine: 1.0, acr: 15,
    onACEIorARB: false, onSGLT2: false, onStatin: false,
    onDiuretic: false, onBetaBlocker: false,
};

export default function AssessmentForm({ onSubmit, onCancel }: Props) {
    const [step, setStep] = useState(1);
    const [patient, setPatient] = useState<PatientData>(defaultPatient);
    const [clinical, setClinical] = useState<ClinicalData>(defaultClinical);
    const [errors, setErrors] = useState<string[]>([]);

    const updatePatient = (field: string, value: unknown) =>
        setPatient(p => ({ ...p, [field]: value }));
    const updateClinical = (field: string, value: unknown) =>
        setClinical(c => ({ ...c, [field]: value }));

    const validateStep1 = () => {
        const errs: string[] = [];
        if (!patient.name.trim()) errs.push('Nome é obrigatório');
        if (patient.age < 18 || patient.age > 120) errs.push('Idade entre 18 e 120');
        setErrors(errs);
        return errs.length === 0;
    };

    const validateStep2 = () => {
        const errs: string[] = [];
        if (clinical.systolicBP < 50 || clinical.systolicBP > 300) errs.push('PAS entre 50-300');
        if (clinical.diastolicBP < 30 || clinical.diastolicBP > 200) errs.push('PAD entre 30-200');
        if (clinical.totalCholesterol < 50 || clinical.totalCholesterol > 500) errs.push('CT entre 50-500');
        if (clinical.hdlCholesterol < 10 || clinical.hdlCholesterol > 150) errs.push('HDL entre 10-150');
        if (clinical.serumCreatinine < 0.1 || clinical.serumCreatinine > 30) errs.push('Creatinina entre 0.1-30');
        if (clinical.systolicBP <= clinical.diastolicBP) errs.push('PAS deve ser > PAD');
        setErrors(errs);
        return errs.length === 0;
    };

    const nextStep = () => {
        if (step === 1 && validateStep1()) setStep(2);
        else if (step === 2 && validateStep2()) setStep(3);
    };

    const handleSubmit = () => {
        onSubmit(patient, clinical);
    };

    const Toggle = ({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) => (
        <label className="form-toggle" style={{ marginBottom: 12 }}>
            <div className={`toggle-switch ${value ? 'active' : ''}`} onClick={() => onChange(!value)} />
            <span>{label}</span>
        </label>
    );

    return (
        <div className="animate-fade-in">
            {/* Stepper */}
            <div className="stepper">
                {[
                    { n: 1, label: 'Paciente' },
                    { n: 2, label: 'Dados Clínicos' },
                    { n: 3, label: 'Revisão' },
                ].map((s, i) => (
                    <div key={s.n} style={{ display: 'flex', alignItems: 'center' }}>
                        <div className={`step ${step === s.n ? 'active' : ''} ${step > s.n ? 'completed' : ''}`}>
                            <div className="step-number">{step > s.n ? '✓' : s.n}</div>
                            <span className="step-label">{s.label}</span>
                        </div>
                        {i < 2 && <div className={`step-line ${step > s.n ? 'completed' : ''}`} />}
                    </div>
                ))}
            </div>

            {errors.length > 0 && (
                <div className="alert alert-danger">
                    <span>⚠️</span>
                    <div>{errors.map((e, i) => <div key={i}>{e}</div>)}</div>
                </div>
            )}

            {/* Step 1: Patient Demographics */}
            {step === 1 && (
                <div className="card">
                    <div className="card-header"><h3 className="card-title">👤 Dados do Paciente</h3></div>
                    <div className="card-body">
                        <div className="form-group">
                            <label className="form-label">Nome do Paciente *</label>
                            <input className="form-input" value={patient.name}
                                onChange={e => updatePatient('name', e.target.value)} placeholder="Nome completo" />
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Idade *</label>
                                <input className="form-input" type="number" value={patient.age}
                                    onChange={e => updatePatient('age', parseInt(e.target.value) || 0)} min={18} max={120} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Sexo *</label>
                                <select className="form-select" value={patient.sex}
                                    onChange={e => updatePatient('sex', e.target.value)}>
                                    <option value="male">Masculino</option>
                                    <option value="female">Feminino</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Etnia</label>
                                <select className="form-select" value={patient.ethnicity || ''}
                                    onChange={e => updatePatient('ethnicity', e.target.value)}>
                                    <option value="white">Branco</option>
                                    <option value="black">Negro</option>
                                    <option value="hispanic">Hispânico</option>
                                    <option value="asian">Asiático</option>
                                    <option value="other">Outro</option>
                                </select>
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Altura (cm)</label>
                                <input className="form-input" type="number" value={patient.heightCm || ''}
                                    onChange={e => updatePatient('heightCm', parseFloat(e.target.value) || undefined)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Peso (kg)</label>
                                <input className="form-input" type="number" value={patient.weightKg || ''}
                                    onChange={e => updatePatient('weightKg', parseFloat(e.target.value) || undefined)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">ID/Prontuário (opcional)</label>
                                <input className="form-input" value={patient.externalId || ''}
                                    onChange={e => updatePatient('externalId', e.target.value)} />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Step 2: Clinical Data */}
            {step === 2 && (
                <div className="card">
                    <div className="card-header"><h3 className="card-title">🩺 Dados Clínicos</h3></div>
                    <div className="card-body">
                        <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: 'var(--accent)' }}>
                            Pressão Arterial & Vitais
                        </h4>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">PAS (mmHg) *</label>
                                <input className="form-input" type="number" value={clinical.systolicBP}
                                    onChange={e => updateClinical('systolicBP', parseInt(e.target.value) || 0)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">PAD (mmHg) *</label>
                                <input className="form-input" type="number" value={clinical.diastolicBP}
                                    onChange={e => updateClinical('diastolicBP', parseInt(e.target.value) || 0)} />
                            </div>
                        </div>
                        <Toggle value={clinical.onBPMedication} onChange={v => updateClinical('onBPMedication', v)} label="Em uso de anti-hipertensivos" />
                        <Toggle value={clinical.hasDiabetes} onChange={v => updateClinical('hasDiabetes', v)} label="Diabetes mellitus" />
                        <Toggle value={clinical.isSmoker} onChange={v => updateClinical('isSmoker', v)} label="Tabagista ativo" />

                        {clinical.hasDiabetes && (
                            <div className="form-group" style={{ marginTop: 8 }}>
                                <label className="form-label">HbA1c (%)</label>
                                <input className="form-input" type="number" step="0.1" value={clinical.hba1c || ''}
                                    onChange={e => updateClinical('hba1c', parseFloat(e.target.value) || undefined)} />
                            </div>
                        )}

                        <h4 style={{ fontSize: 15, fontWeight: 700, margin: '24px 0 16px', color: 'var(--accent)' }}>
                            Perfil Lipídico (mg/dL)
                        </h4>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Colesterol Total *</label>
                                <input className="form-input" type="number" value={clinical.totalCholesterol}
                                    onChange={e => updateClinical('totalCholesterol', parseInt(e.target.value) || 0)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">HDL *</label>
                                <input className="form-input" type="number" value={clinical.hdlCholesterol}
                                    onChange={e => updateClinical('hdlCholesterol', parseInt(e.target.value) || 0)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">LDL</label>
                                <input className="form-input" type="number" value={clinical.ldlCholesterol || ''}
                                    onChange={e => updateClinical('ldlCholesterol', parseInt(e.target.value) || undefined)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Triglicerídeos</label>
                                <input className="form-input" type="number" value={clinical.triglycerides || ''}
                                    onChange={e => updateClinical('triglycerides', parseInt(e.target.value) || undefined)} />
                            </div>
                        </div>

                        <h4 style={{ fontSize: 15, fontWeight: 700, margin: '24px 0 16px', color: 'var(--accent)' }}>
                            Função Renal
                        </h4>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Creatinina sérica (mg/dL) *</label>
                                <input className="form-input" type="number" step="0.01" value={clinical.serumCreatinine}
                                    onChange={e => updateClinical('serumCreatinine', parseFloat(e.target.value) || 0)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">ACR – Albumina/Creatinina (mg/g)</label>
                                <input className="form-input" type="number" value={clinical.acr ?? ''}
                                    onChange={e => updateClinical('acr', parseFloat(e.target.value) || undefined)} />
                            </div>
                        </div>

                        <h4 style={{ fontSize: 15, fontWeight: 700, margin: '24px 0 16px', color: 'var(--accent)' }}>
                            Eletrólitos (Avançado – Opcional)
                        </h4>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Potássio (mEq/L)</label>
                                <input className="form-input" type="number" step="0.1" value={clinical.potassium || ''}
                                    onChange={e => updateClinical('potassium', parseFloat(e.target.value) || undefined)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Sódio (mEq/L)</label>
                                <input className="form-input" type="number" value={clinical.sodium || ''}
                                    onChange={e => updateClinical('sodium', parseInt(e.target.value) || undefined)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Cálcio (mg/dL)</label>
                                <input className="form-input" type="number" step="0.1" value={clinical.calcium || ''}
                                    onChange={e => updateClinical('calcium', parseFloat(e.target.value) || undefined)} />
                            </div>
                        </div>

                        <h4 style={{ fontSize: 15, fontWeight: 700, margin: '24px 0 16px', color: 'var(--accent)' }}>
                            Medicações em Uso
                        </h4>
                        <Toggle value={clinical.onACEIorARB || false} onChange={v => updateClinical('onACEIorARB', v)} label="IECA / BRA" />
                        <Toggle value={clinical.onSGLT2 || false} onChange={v => updateClinical('onSGLT2', v)} label="Inibidor SGLT2" />
                        <Toggle value={clinical.onStatin || false} onChange={v => updateClinical('onStatin', v)} label="Estatina" />
                        <Toggle value={clinical.onDiuretic || false} onChange={v => updateClinical('onDiuretic', v)} label="Diurético" />
                        <Toggle value={clinical.onBetaBlocker || false} onChange={v => updateClinical('onBetaBlocker', v)} label="Betabloqueador" />

                        <h4 style={{ fontSize: 15, fontWeight: 700, margin: '24px 0 16px', color: 'var(--accent)' }}>
                            Histórico
                        </h4>
                        <Toggle value={clinical.hasHeartFailure || false} onChange={v => updateClinical('hasHeartFailure', v)} label="Insuficiência Cardíaca" />
                        <Toggle value={clinical.hasCAD || false} onChange={v => updateClinical('hasCAD', v)} label="Doença Arterial Coronariana" />
                        <Toggle value={clinical.hasStroke || false} onChange={v => updateClinical('hasStroke', v)} label="AVC prévio" />
                        <Toggle value={clinical.hasCKD || false} onChange={v => updateClinical('hasCKD', v)} label="Doença Renal Crônica conhecida" />
                    </div>
                </div>
            )}

            {/* Step 3: Review */}
            {step === 3 && (
                <div className="card">
                    <div className="card-header"><h3 className="card-title">📋 Revisão dos Dados</h3></div>
                    <div className="card-body">
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                            <div>
                                <h4 style={{ fontWeight: 700, marginBottom: 12, color: 'var(--accent)' }}>Paciente</h4>
                                <p><strong>Nome:</strong> {patient.name}</p>
                                <p><strong>Idade:</strong> {patient.age} anos</p>
                                <p><strong>Sexo:</strong> {patient.sex === 'male' ? 'Masculino' : 'Feminino'}</p>
                                {patient.heightCm && patient.weightKg && (
                                    <p><strong>IMC:</strong> {(patient.weightKg / Math.pow(patient.heightCm / 100, 2)).toFixed(1)} kg/m²</p>
                                )}
                            </div>
                            <div>
                                <h4 style={{ fontWeight: 700, marginBottom: 12, color: 'var(--accent)' }}>Dados Clínicos</h4>
                                <p><strong>PA:</strong> {clinical.systolicBP}/{clinical.diastolicBP} mmHg</p>
                                <p><strong>CT/HDL:</strong> {clinical.totalCholesterol}/{clinical.hdlCholesterol} mg/dL</p>
                                <p><strong>Creatinina:</strong> {clinical.serumCreatinine} mg/dL</p>
                                <p><strong>ACR:</strong> {clinical.acr ?? 'Não informado'} mg/g</p>
                                <p><strong>Diabetes:</strong> {clinical.hasDiabetes ? 'Sim' : 'Não'}</p>
                                <p><strong>Tabagismo:</strong> {clinical.isSmoker ? 'Sim' : 'Não'}</p>
                            </div>
                        </div>
                        <div className="disclaimer" style={{ marginTop: 24, fontSize: 12 }}>
                            ⚠️ Ao prosseguir, os cálculos determinísticos serão executados. Verifique se todos os dados estão corretos.
                        </div>
                    </div>
                </div>
            )}

            {/* Buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
                <button className="btn btn-secondary" onClick={step === 1 ? onCancel : () => setStep(s => s - 1)}>
                    {step === 1 ? 'Cancelar' : '← Voltar'}
                </button>
                {step < 3 ? (
                    <button className="btn btn-primary" onClick={nextStep}>Próximo →</button>
                ) : (
                    <button className="btn btn-success btn-lg" onClick={handleSubmit}>
                        🧮 Calcular Risco Cardiorrenal
                    </button>
                )}
            </div>
        </div>
    );
}
