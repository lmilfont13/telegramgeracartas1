'use client';
import { useState, useCallback } from 'react';
import LoginPage from '@/components/LoginPage';
import AssessmentForm from '@/components/AssessmentForm';
import ResultsDashboard from '@/components/ResultsDashboard';
import type { PatientData, ClinicalData, CardiacResult, RenalResult, AIInterpretation, AssessmentResult } from '@/lib/types';
import { runCalculations } from '@/lib/calculators/selector';
import { generateInterpretation } from '@/lib/ai/interpreter';
import { generateClinicalPDF } from '@/lib/pdf/generator';
import { logAudit } from '@/lib/audit';
import { DISCLAIMER_SHORT, APP_VERSION } from '@/lib/constants';
import { v4 as uuidv4 } from 'uuid';

type View = 'login' | 'dashboard' | 'form' | 'results';

interface User {
  email: string;
  name: string;
  role: 'admin' | 'clinician';
}

export default function HomePage() {
  const [view, setView] = useState<View>('login');
  const [user, setUser] = useState<User | null>(null);
  const [patient, setPatient] = useState<PatientData | null>(null);
  const [clinical, setClinical] = useState<ClinicalData | null>(null);
  const [cardiac, setCardiac] = useState<CardiacResult | null>(null);
  const [renal, setRenal] = useState<RenalResult | null>(null);
  const [interpretation, setInterpretation] = useState<AIInterpretation | null>(null);
  const [history, setHistory] = useState<AssessmentResult[]>([]);
  const [loading, setLoading] = useState(false);

  const handleLogin = useCallback((u: User) => {
    setUser(u);
    logAudit({ userId: u.email, action: 'login', entityType: 'user', entityId: u.email, details: {} });
    setView('dashboard');
  }, []);

  const handleLogout = () => {
    setUser(null);
    setView('login');
  };

  const handleCalculate = useCallback((p: PatientData, c: ClinicalData) => {
    setLoading(true);
    setPatient(p);
    setClinical(c);

    try {
      const results = runCalculations(p, c);
      setCardiac(results.cardiac);
      setRenal(results.renal);

      const interp = generateInterpretation(p, c, results.cardiac, results.renal, 'pt-BR');
      setInterpretation(interp);

      logAudit({
        userId: user?.email || '',
        action: 'calculate',
        entityType: 'assessment',
        entityId: results.cardiac.id,
        details: {
          cardiacModel: results.cardiac.modelUsed,
          cardiacRisk10y: results.cardiac.risk10yPercent,
          renalStage: `${results.renal.gfrStage}/${results.renal.albuminuriaStage}`,
          warnings: results.warnings,
        },
      });

      const assessmentResult: AssessmentResult = {
        id: uuidv4(),
        patientId: p.id || p.name,
        assessmentDate: new Date().toISOString(),
        cardiacResult: results.cardiac,
        renalResult: results.renal,
        aiInterpretation: interp,
        version: APP_VERSION,
      };
      setHistory(prev => [assessmentResult, ...prev]);
      setView('results');
    } catch (err) {
      console.error('Calculation error:', err);
      alert('Erro ao calcular. Verifique os dados inseridos.');
    }
    setLoading(false);
  }, [user]);

  const handleGeneratePDF = () => {
    if (patient && clinical && cardiac && renal && interpretation) {
      generateClinicalPDF({ patient, clinical, cardiac, renal, interpretation });
      logAudit({
        userId: user?.email || '',
        action: 'generate_pdf',
        entityType: 'assessment',
        entityId: cardiac.id,
        details: { patientName: patient.name },
      });
    }
  };

  const handleNewAssessment = () => {
    setPatient(null);
    setClinical(null);
    setCardiac(null);
    setRenal(null);
    setInterpretation(null);
    setView('form');
  };

  if (view === 'login') return <LoginPage onLogin={handleLogin} />;

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">🫀</div>
            <div>
              <div className="sidebar-logo-text">CardioRenal</div>
              <div className="sidebar-logo-sub">Risk Report</div>
            </div>
          </div>
        </div>
        <nav className="sidebar-nav">
          <button className={`nav-item ${view === 'dashboard' ? 'active' : ''}`}
            onClick={() => setView('dashboard')}>
            <span className="nav-icon">📊</span> Dashboard
          </button>
          <button className={`nav-item ${view === 'form' ? 'active' : ''}`}
            onClick={() => setView('form')}>
            <span className="nav-icon">📝</span> Nova Avaliação
          </button>
          {cardiac && (
            <button className={`nav-item ${view === 'results' ? 'active' : ''}`}
              onClick={() => setView('results')}>
              <span className="nav-icon">📋</span> Resultados
            </button>
          )}
        </nav>
        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">{user?.name.charAt(0) || 'U'}</div>
            <div>
              <div className="user-name">{user?.name}</div>
              <div className="user-role">{user?.role === 'admin' ? 'Administrador' : 'Profissional'}</div>
            </div>
          </div>
          <button className="nav-item" onClick={handleLogout} style={{ marginTop: 12, fontSize: 13 }}>
            <span className="nav-icon">🚪</span> Sair
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {view === 'dashboard' && (
          <DashboardView
            history={history}
            onNewAssessment={() => setView('form')}
            onViewResult={(id) => {
              setView('results');
            }}
          />
        )}

        {view === 'form' && (
          <AssessmentForm onSubmit={handleCalculate} onCancel={() => setView('dashboard')} />
        )}

        {view === 'results' && cardiac && renal && interpretation && patient && (
          <ResultsDashboard
            cardiac={cardiac}
            renal={renal}
            interpretation={interpretation}
            patientName={patient.name}
            onGeneratePDF={handleGeneratePDF}
            onNewAssessment={handleNewAssessment}
          />
        )}
      </main>
    </div>
  );
}

// Dashboard sub-component
function DashboardView({ history, onNewAssessment, onViewResult }: {
  history: AssessmentResult[];
  onNewAssessment: () => void;
  onViewResult: (id: string) => void;
}) {
  const classLabels: Record<string, string> = { low: 'Baixo', moderate: 'Moderado', high: 'Alto', very_high: 'Muito Alto' };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 className="section-title">Dashboard</h1>
          <p className="section-subtitle">Visão geral das avaliações cardiorrenais</p>
        </div>
        <button className="btn btn-primary btn-lg" onClick={onNewAssessment}>
          ➕ Nova Avaliação
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <div className="card-body">
            <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--accent)' }}>{history.length}</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Avaliações Realizadas</div>
          </div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div className="card-body">
            <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--danger)' }}>
              {history.filter(h => h.cardiacResult.classification === 'high' || h.cardiacResult.classification === 'very_high').length}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Alto Risco Cardíaco</div>
          </div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div className="card-body">
            <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--warning)' }}>
              {history.filter(h => h.renalResult.riskCategory === 'high' || h.renalResult.riskCategory === 'very_high').length}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Alto Risco Renal</div>
          </div>
        </div>
      </div>

      {/* History */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">📜 Histórico de Avaliações</h3>
        </div>
        <div className="card-body">
          {history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
              <p style={{ fontSize: 16 }}>Nenhuma avaliação ainda</p>
              <p style={{ fontSize: 14, marginTop: 8 }}>Clique em "Nova Avaliação" para começar</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)' }}>
                  <th style={{ textAlign: 'left', padding: '10px 8px', fontWeight: 700 }}>Paciente</th>
                  <th style={{ textAlign: 'center', padding: '10px 8px', fontWeight: 700 }}>Risco Cardio 10a</th>
                  <th style={{ textAlign: 'center', padding: '10px 8px', fontWeight: 700 }}>KDIGO</th>
                  <th style={{ textAlign: 'center', padding: '10px 8px', fontWeight: 700 }}>Data</th>
                </tr>
              </thead>
              <tbody>
                {history.map(h => (
                  <tr key={h.id} style={{ borderBottom: '1px solid var(--border-light)', cursor: 'pointer' }}
                    onClick={() => onViewResult(h.id)}>
                    <td style={{ padding: '12px 8px' }}>{h.patientId}</td>
                    <td style={{ textAlign: 'center', padding: '12px 8px' }}>
                      <span className={`risk-badge ${h.cardiacResult.classification}`}>
                        {h.cardiacResult.risk10yPercent}% – {classLabels[h.cardiacResult.classification]}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center', padding: '12px 8px' }}>
                      <span className={`risk-badge ${h.renalResult.riskCategory}`}>
                        {h.renalResult.gfrStage}/{h.renalResult.albuminuriaStage}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center', padding: '12px 8px', color: 'var(--text-muted)' }}>
                      {new Date(h.assessmentDate).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Disclaimer at bottom */}
      <div className="disclaimer" style={{ marginTop: 32, fontSize: 12 }}>
        {DISCLAIMER_SHORT['pt-BR']}
      </div>
    </div>
  );
}
