'use client';
import { useState } from 'react';
import { DEMO_CREDENTIALS, DISCLAIMER_SHORT } from '@/lib/constants';

interface Props {
    onLogin: (user: { email: string; name: string; role: 'admin' | 'clinician' }) => void;
}

export default function LoginPage({ onLogin }: Props) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const admin = DEMO_CREDENTIALS.admin;
        const clinician = DEMO_CREDENTIALS.clinician;

        if (email === admin.email && password === admin.password) {
            onLogin({ email: admin.email, name: admin.name, role: admin.role });
        } else if (email === clinician.email && password === clinician.password) {
            onLogin({ email: clinician.email, name: clinician.name, role: clinician.role });
        } else {
            setError('E-mail ou senha incorretos.');
        }
    };

    return (
        <div className="login-page">
            <div className="login-card animate-fade-in">
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <div style={{ fontSize: 48, marginBottom: 8 }}>🫀🩺</div>
                    <h1 className="login-title">CardioRenal Risk Report</h1>
                    <p className="login-subtitle">Relatório integrado de risco cardiorrenal</p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">E-mail</label>
                        <input
                            className="form-input"
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="seu@email.com"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Senha</label>
                        <input
                            className="form-input"
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    {error && <div className="alert alert-danger" style={{ marginBottom: 16 }}>⚠️ {error}</div>}

                    <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', marginBottom: 16 }}>
                        Entrar
                    </button>
                </form>

                <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
                    <p style={{ marginBottom: 8 }}><strong>Demo:</strong> admin@cardiorenal.app / admin123</p>
                    <p style={{ marginBottom: 8 }}>ou medico@cardiorenal.app / medico123</p>
                </div>

                <div className="disclaimer" style={{ marginTop: 16, fontSize: 11 }}>
                    {DISCLAIMER_SHORT['pt-BR']}
                </div>
            </div>
        </div>
    );
}
