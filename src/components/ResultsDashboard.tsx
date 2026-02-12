'use client';
import { useEffect, useRef } from 'react';
import type { CardiacResult, RenalResult, AIInterpretation } from '@/lib/types';
import { RISK_COLORS, CALCULATOR_VERSIONS, DISCLAIMER } from '@/lib/constants';
import { getGFRStageLabel, getAlbuminuriaStageLabel } from '@/lib/calculators/kdigo';
import Chart from 'chart.js/auto';

interface Props {
    cardiac: CardiacResult;
    renal: RenalResult;
    interpretation: AIInterpretation;
    patientName: string;
    onGeneratePDF: () => void;
    onNewAssessment: () => void;
}

export default function ResultsDashboard({ cardiac, renal, interpretation, patientName, onGeneratePDF, onNewAssessment }: Props) {
    const barChartRef = useRef<HTMLCanvasElement>(null);
    const renalChartRef = useRef<HTMLCanvasElement>(null);
    const barChartInstance = useRef<Chart | null>(null);
    const renalChartInstance = useRef<Chart | null>(null);

    useEffect(() => {
        if (barChartRef.current) {
            if (barChartInstance.current) barChartInstance.current.destroy();
            const labels: string[] = [];
            const data: number[] = [];
            const colors: string[] = [];

            if (cardiac.risk5yPercent !== null) {
                labels.push('Cardio 5 anos');
                data.push(cardiac.risk5yPercent);
                colors.push('#60a5fa');
            }
            labels.push('Cardio 10 anos');
            data.push(cardiac.risk10yPercent);
            colors.push('#3b82f6');

            if (renal.kfre2yPercent !== null) {
                labels.push('Renal 2 anos');
                data.push(renal.kfre2yPercent);
                colors.push('#f59e0b');
            }
            if (renal.kfre5yPercent !== null) {
                labels.push('Renal 5 anos');
                data.push(renal.kfre5yPercent);
                colors.push('#ef4444');
            }

            barChartInstance.current = new Chart(barChartRef.current, {
                type: 'bar',
                data: {
                    labels,
                    datasets: [{
                        label: 'Risco (%)',
                        data,
                        backgroundColor: colors,
                        borderRadius: 8,
                        barThickness: 48,
                    }],
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { display: false },
                        title: { display: true, text: 'Riscos Calculados (%)', font: { size: 16, weight: 'bold' } },
                    },
                    scales: {
                        y: { beginAtZero: true, max: Math.max(...data, 30) + 10, title: { display: true, text: '%' } },
                    },
                },
            });
        }

        return () => { barChartInstance.current?.destroy(); renalChartInstance.current?.destroy(); };
    }, [cardiac, renal]);

    const gfrInfo = getGFRStageLabel(renal.gfrStage);
    const acrInfo = getAlbuminuriaStageLabel(renal.albuminuriaStage);
    const classLabels: Record<string, string> = { low: 'Baixo', moderate: 'Moderado', high: 'Alto', very_high: 'Muito Alto' };

    return (
        <div className="animate-fade-in">
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <h2 className="section-title">Resultados: {patientName}</h2>
                    <p className="section-subtitle">Gerado em {new Date().toLocaleString('pt-BR')}</p>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                    <button className="btn btn-secondary" onClick={onNewAssessment}>Nova Avaliação</button>
                    <button className="btn btn-primary" onClick={onGeneratePDF}>📄 Gerar PDF</button>
                </div>
            </div>

            {/* Disclaimer */}
            <div className="disclaimer" style={{ marginBottom: 24 }}>{DISCLAIMER['pt-BR']}</div>

            {/* Risk Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 32 }}>
                <div className={`risk-card ${cardiac.classification}`}>
                    <div className="risk-label">Risco Cardiovascular – 10 anos</div>
                    <div className="risk-value">{cardiac.risk10yPercent}%</div>
                    <span className={`risk-badge ${cardiac.classification}`}>{classLabels[cardiac.classification]}</span>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8 }}>
                        Modelo: {CALCULATOR_VERSIONS[cardiac.modelUsed]?.name || cardiac.modelUsed}
                    </p>
                    {cardiac.risk5yPercent !== null && (
                        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>5 anos: {cardiac.risk5yPercent}%</p>
                    )}
                </div>

                <div className={`risk-card ${renal.riskCategory}`}>
                    <div className="risk-label">Risco Renal (KDIGO)</div>
                    <div className="risk-value" style={{ fontSize: 36 }}>{renal.gfrStage}/{renal.albuminuriaStage}</div>
                    <span className={`risk-badge ${renal.riskCategory}`}>{classLabels[renal.riskCategory]}</span>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8 }}>
                        eGFR: {renal.eGFRCalculated} mL/min/1.73m²
                    </p>
                </div>

                {renal.kfre5yPercent !== null && (
                    <div className={`risk-card ${renal.kfre5yPercent > 15 ? 'very_high' : renal.kfre5yPercent > 5 ? 'high' : 'moderate'}`}>
                        <div className="risk-label">Risco Falência Renal (KFRE)</div>
                        <div className="risk-value">{renal.kfre5yPercent}%</div>
                        <span className="risk-badge moderate">5 anos</span>
                        {renal.kfre2yPercent !== null && (
                            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>2 anos: {renal.kfre2yPercent}%</p>
                        )}
                    </div>
                )}
            </div>

            {/* Red Flags */}
            {interpretation.redFlags.length > 0 && (
                <div className="card" style={{ marginBottom: 24 }}>
                    <div className="card-header"><h3 className="card-title">🚨 Alertas (Red Flags)</h3></div>
                    <div className="card-body">
                        {interpretation.redFlags.map((rf, i) => (
                            <div key={i} className={`red-flag ${rf.severity}`}>
                                <span className="red-flag-icon">{rf.severity === 'critical' ? '🔴' : '🟡'}</span>
                                <div className="red-flag-text">
                                    <strong>{rf.flag}</strong>
                                    <span>{rf.action}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Charts */}
            <div className="charts-grid" style={{ marginBottom: 32 }}>
                <div className="chart-container">
                    <canvas ref={barChartRef} />
                </div>

                {/* KDIGO Heatmap */}
                <div className="chart-container">
                    <h4 style={{ fontWeight: 700, marginBottom: 16 }}>Matriz de Risco KDIGO</h4>
                    <KDIGOMatrix currentGFR={renal.gfrStage} currentACR={renal.albuminuriaStage} />
                </div>
            </div>

            {/* Contributing Factors */}
            <div className="card" style={{ marginBottom: 24 }}>
                <div className="card-header">
                    <h3 className="card-title">📊 O Que Elevou o Risco (Top Fatores)</h3>
                </div>
                <div className="card-body">
                    {interpretation.topFactors.map((f, i) => (
                        <div key={i} className="factor-item">
                            <div className="factor-icon high" />
                            <div className="factor-text">
                                <div className="factor-name">{i + 1}. {f.factor}</div>
                                <div className="factor-desc">{f.explanation}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* AI Interpretation */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
                <div className="card">
                    <div className="card-header"><h3 className="card-title">🩺 Resumo Clínico</h3></div>
                    <div className="card-body">
                        <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'var(--font-sans)', fontSize: 14, lineHeight: 1.7 }}>
                            {interpretation.clinicalSummary}
                        </pre>
                    </div>
                </div>
                <div className="card">
                    <div className="card-header"><h3 className="card-title">👤 Resumo para Paciente</h3></div>
                    <div className="card-body">
                        <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'var(--font-sans)', fontSize: 14, lineHeight: 1.7 }}>
                            {interpretation.laySummary}
                        </pre>
                    </div>
                </div>
            </div>

            {/* Recommendations */}
            <div className="card" style={{ marginBottom: 24 }}>
                <div className="card-header"><h3 className="card-title">💡 Recomendações</h3></div>
                <div className="card-body">
                    <ul style={{ paddingLeft: 20, lineHeight: 2 }}>
                        {interpretation.recommendations.map((r, i) => (
                            <li key={i} style={{ fontSize: 14 }}>{r}</li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* Metadata */}
            <div className="card" style={{ marginBottom: 24 }}>
                <div className="card-header"><h3 className="card-title">ℹ️ Metadados do Cálculo</h3></div>
                <div className="card-body" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    <p><strong>Modelo cardíaco:</strong> {cardiac.metadata.modelName} ({cardiac.metadata.modelVersion})</p>
                    <p><strong>Referência:</strong> {cardiac.metadata.reference}</p>
                    <p><strong>eGFR:</strong> CKD-EPI 2021 (race-free)</p>
                    <p><strong>Calculado em:</strong> {new Date(cardiac.metadata.calculatedAt).toLocaleString('pt-BR')}</p>
                    <p><strong>Versão do app:</strong> 1.0.0-mvp</p>
                    <h4 style={{ fontWeight: 700, marginTop: 16, marginBottom: 8 }}>Limitações do Modelo</h4>
                    <ul style={{ paddingLeft: 20 }}>
                        {cardiac.metadata.limitations.map((l, i) => <li key={i}>{l}</li>)}
                        {renal.metadata.limitations.map((l, i) => <li key={`r${i}`}>{l}</li>)}
                    </ul>
                </div>
            </div>
        </div>
    );
}

// KDIGO Heatmap sub-component
function KDIGOMatrix({ currentGFR, currentACR }: { currentGFR: string; currentACR: string }) {
    const stages = ['G1', 'G2', 'G3a', 'G3b', 'G4', 'G5'];
    const acrs = ['A1', 'A2', 'A3'];
    const matrix: Record<string, Record<string, string>> = {
        G1: { A1: 'low', A2: 'moderate', A3: 'high' },
        G2: { A1: 'low', A2: 'moderate', A3: 'high' },
        G3a: { A1: 'moderate', A2: 'high', A3: 'very_high' },
        G3b: { A1: 'high', A2: 'very_high', A3: 'very_high' },
        G4: { A1: 'very_high', A2: 'very_high', A3: 'very_high' },
        G5: { A1: 'very_high', A2: 'very_high', A3: 'very_high' },
    };
    const gfrRanges: Record<string, string> = { G1: '≥90', G2: '60-89', G3a: '45-59', G3b: '30-44', G4: '15-29', G5: '<15' };

    return (
        <div className="kdigo-grid" style={{ fontSize: 11 }}>
            <div className="kdigo-cell header" />
            {acrs.map(a => <div key={a} className="kdigo-cell header">{a}<br />{a === 'A1' ? '<30' : a === 'A2' ? '30-300' : '>300'}</div>)}
            {stages.map(g => (
                <>
                    <div key={`gfr-${g}`} className="kdigo-cell header">{g}<br />{gfrRanges[g]}</div>
                    {acrs.map(a => (
                        <div key={`${g}-${a}`}
                            className={`kdigo-cell ${matrix[g][a]} ${g === currentGFR && a === currentACR ? 'current' : ''}`}>
                            {g === currentGFR && a === currentACR ? '◉' : ''}
                        </div>
                    ))}
                </>
            ))}
        </div>
    );
}
