const express = require('express');
const { spawn, exec } = require('child_process');
const path = require('path');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '.env.local') });

const app = express();
const PORT = 3333;
const PASSWORD = process.env.DASHBOARD_PASSWORD || 'admin123';

app.use(express.urlencoded({ extended: true }));
app.use(cookieParser('saas-secret-key'));

let workerProcess = null;
let logs = [];
const MAX_LOGS = 200;

function addLog(msg) {
    const timestamp = new Date().toLocaleTimeString();
    if (typeof msg === 'string') {
        logs.push({ time: timestamp, content: msg });
    } else {
        const lines = msg.toString().split('\n');
        lines.forEach(line => {
            if (line.trim()) {
                logs.push({ time: timestamp, content: line.trim() });
            }
        });
    }
    if (logs.length > MAX_LOGS) logs.shift();
}

function startWorker() {
    if (workerProcess) return;

    addLog('🚀 Iniciando saas-worker.js...');

    workerProcess = spawn('node', ['saas-worker.js'], {
        cwd: __dirname,
        env: process.env,
        shell: true
    });

    workerProcess.stdout.on('data', (data) => addLog(data));
    workerProcess.stderr.on('data', (data) => addLog(data));

    workerProcess.on('close', (code) => {
        addLog(`🛑 Processo encerrado com código ${code}`);
        workerProcess = null;
    });
}

function stopWorker() {
    return new Promise((resolve) => {
        if (workerProcess) {
            workerProcess.kill('SIGINT');
            setTimeout(() => {
                if (workerProcess) workerProcess.kill('SIGKILL');
                workerProcess = null;
                addLog('🛑 Processo interrompido.');
                resolve();
            }, 1000);
        } else {
            resolve();
        }
    });
}

// Global Cleanup
function cleanupSystem() {
    return new Promise((resolve) => {
        addLog('🛠️ Executando limpeza geral de processos node...');
        const cmd = 'powershell "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like \'*saas-worker.js*\' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }"';
        exec(cmd, (err, stdout, stderr) => {
            if (err) addLog(`⚠️ Aviso na limpeza: ${err.message}`);
            else addLog('✅ Limpeza concluída.');
            resolve();
        });
    });
}

const auth = (req, res, next) => {
    if (req.signedCookies.auth === 'true') return next();
    if (req.path === '/login') return next();
    res.redirect('/login');
};

app.get('/login', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>SaaS Login</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;900&display=swap" rel="stylesheet">
            <style>
                body { margin: 0; padding: 0; font-family: 'Outfit', sans-serif; height: 100vh; display: flex; align-items: center; justify-content: center; background: #FFFFFF; color: #000000; -webkit-font-smoothing: antialiased; }
                .card { padding: 3rem; border-radius: 2rem; border: 1px solid #F1F5F9; width: 100%; max-width: 360px; box-shadow: 0 10px 30px -10px rgba(0,0,0,0.05); text-align: center; }
                .logo { height: 3rem; w-height: 3rem; background: #000; border-radius: 1rem; display: flex; align-items: center; justify-content: center; margin: 0 auto 2rem; }
                h1 { margin-bottom: 0.5rem; font-weight: 900; font-size: 1.5rem; text-transform: uppercase; letter-spacing: -0.02em; }
                p { font-size: 0.8rem; color: #94A3B8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 2.5rem; }
                input { width: 100%; padding: 1rem; margin-bottom: 1.5rem; border-radius: 1rem; border: 1px solid #F1F5F9; background: #F8FAFC; color: #000; box-sizing: border-box; font-size: 1rem; transition: all 0.2s; font-weight: 600; }
                input:focus { outline: none; border-color: #000; background: #FFF; }
                button { width: 100%; padding: 1rem; border-radius: 1rem; border: none; background: #000; color: white; font-weight: 900; font-size: 0.8rem; cursor: pointer; transition: all 0.2s; text-transform: uppercase; letter-spacing: 0.15em; }
                button:hover { background: #1E293B; transform: translateY(-2px); }
                button:active { transform: scale(0.98); }
            </style>
        </head>
        <body>
            <div class="card">
                <div class="logo">
                   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
                </div>
                <h1>SaaS Access</h1>
                <p>Engine Panel</p>
                <form action="/login" method="POST">
                    <input type="password" name="password" placeholder="PASSWORD" autofocus required>
                    <button type="submit">Sign In</button>
                </form>
            </div>
        </body>
        </html>
    `);
});

app.post('/login', (req, res) => {
    if (req.body.password === PASSWORD) {
        res.cookie('auth', 'true', { signed: true, httpOnly: true });
        res.redirect('/');
    } else {
        res.redirect('/login?error=1');
    }
});

app.get('/logout', (req, res) => {
    res.clearCookie('auth');
    res.redirect('/login');
});

app.get('/', auth, (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>SaaS Engine Panel</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;900&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">
            <script src="https://unpkg.com/lucide@latest"></script>
            <style>
                body { margin: 0; padding: 0; font-family: 'Outfit', sans-serif; background: #FFFFFF; color: #000000; min-height: 100vh; -webkit-font-smoothing: antialiased; }
                .main-layout { display: flex; min-height: 100vh; }
                
                /* Sidebar Style integrated with top header */
                .container { max-width: 1000px; margin: 0 auto; padding: 3rem 2rem; width: 100%; }
                
                header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 4rem; padding-bottom: 2rem; border-bottom: 1px solid #F1F5F9; }
                h1 { margin: 0; font-weight: 900; font-size: 1.75rem; text-transform: uppercase; letter-spacing: -0.04em; }
                header p { margin: 0.2rem 0 0 0; color: #94A3B8; font-weight: 700; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.15em; }
                
                .header-actions { display: flex; align-items: center; gap: 1.5rem; }
                .status-badge { padding: 0.5rem 1rem; border-radius: 0.75rem; font-size: 0.65rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; border: 1px solid transparent; transition: all 0.3s; display: flex; align-items: center; gap: 0.5rem; }
                .status-on { background: #ECFDF5; border-color: #10B981; color: #059669; }
                .status-on::before { content: ''; width: 6px; height: 6px; background: #10B981; border-radius: 50%; display: inline-block; animation: pulse 2s infinite; }
                .status-off { background: #F8FAFC; border-color: #E2E8F0; color: #64748B; }
                
                .grid { display: grid; grid-template-columns: 280px 1fr; gap: 3rem; }
                @media (max-width: 900px) { .grid { grid-template-columns: 1fr; gap: 2rem; } }
                
                .panel { background: #FFFFFF; border-radius: 1.5rem; border: 1px solid #F1F5F9; padding: 2rem; box-shadow: 0 4px 20px -10px rgba(0,0,0,0.03); }
                .section-title { font-size: 0.65rem; font-weight: 900; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.2em; margin: 0 0 1.5rem 0; display: flex; align-items: center; gap: 0.75rem; }
                .section-title i { width: 14px; height: 14px; }
                
                .controls { display: flex; flex-direction: column; gap: 0.75rem; }
                
                button { padding: 1rem; border-radius: 1rem; border: 1px solid transparent; font-weight: 800; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 0.75rem; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.1em; }
                button:hover { transform: translateY(-2px); box-shadow: 0 8px 15px -10px rgba(0,0,0,0.1); }
                button:disabled { opacity: 0.3; cursor: not-allowed; transform: none !important; box-shadow: none !important; }
                
                .btn-start { background: #000000; color: #FFFFFF; }
                .btn-stop { background: #FFFFFF; border-color: #FEE2E2; color: #EF4444; }
                .btn-stop:hover { background: #FEF2F2; }
                .btn-restart { background: #F8FAFC; border-color: #F1F5F9; color: #1E293B; }
                .btn-cleanup { background: #FFFFFF; border-color: #F1F5F9; color: #94A3B8; margin-top: 1rem; font-size: 0.6rem; border-style: dashed; }
                .btn-cleanup:hover { color: #EF4444; border-color: #FEE2E2; }
                .btn-logout { background: transparent; color: #94A3B8; border: none; font-size: 0.65rem; padding: 0.5rem; font-weight: 800; border-radius: 0.5rem; }
                .btn-logout:hover { background: #F8FAFC; color: #000; }
                
                .terminal-container { background: #FFFFFF; border-radius: 1.5rem; border: 1px solid #F1F5F9; overflow: hidden; display: flex; flex-direction: column; height: 500px; box-shadow: 0 4px 25px -10px rgba(0,0,0,0.05); }
                .terminal-header { padding: 1.25rem 1.5rem; border-bottom: 1px solid #F1F5F9; display: flex; justify-content: space-between; align-items: center; background: #F8FAFC; }
                .terminal-title { font-size: 0.6rem; font-weight: 900; color: #64748B; text-transform: uppercase; letter-spacing: 0.2em; display: flex; align-items: center; gap: 0.5rem; }
                .log-count { font-size: 0.6rem; font-weight: 800; color: #94A3B8; background: #FFFFFF; padding: 0.25rem 0.6rem; border-radius: 0.5rem; border: 1px solid #F1F5F9; }
                
                .console-body { flex: 1; padding: 1.5rem; overflow-y: auto; font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; display: flex; flex-direction: column-reverse; background: #FFFFFF; }
                .log-line { margin-bottom: 0.75rem; padding-bottom: 0.75rem; border-bottom: 1px solid #F8FAFC; display: flex; gap: 1rem; line-height: 1.6; }
                .log-time { color: #CBD5E1; font-weight: 500; white-space: nowrap; flex-shrink: 0; font-size: 0.65rem; pt: 0.1rem; }
                .log-content { color: #1E293B; word-break: break-all; }
                .log-content.system { color: #10B981; font-weight: 700; }
                .log-content.error { color: #EF4444; font-weight: 700; }

                @keyframes pulse {
                    0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
                    70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
                    100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
                }

                ::-webkit-scrollbar { width: 5px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: #F1F5F9; border-radius: 10px; }
                ::-webkit-scrollbar-thumb:hover { background: #E2E8F0; }
            </style>
        </head>
        <body>
            <div class="container">
                <header>
                    <div>
                        <h1>Gerador de Cartas</h1>
                        <p>Engine Controller v3.1</p>
                    </div>
                    <div class="header-actions">
                        <div id="status" class="status-badge status-off">OFFLINE</div>
                        <a href="/logout" title="Sign Out"><button class="btn-logout"><i data-lucide="log-out" style="width: 14px; height: 14px;"></i></button></a>
                    </div>
                </header>

                <div class="grid">
                    <div class="panel">
                        <h3 class="section-title"><i data-lucide="sliders"></i> Operations</h3>
                        <div class="controls">
                            <button id="start" class="btn-start"><i data-lucide="play" style="width: 14px; height: 14px;"></i> Iniciar</button>
                            <button id="stop" class="btn-stop"><i data-lucide="square" style="width: 14px; height: 14px;"></i> Parar</button>
                            <button id="restart" class="btn-restart"><i data-lucide="refresh-cw" style="width: 14px; height: 14px;"></i> Reiniciar</button>
                            <button id="cleanup" class="btn-cleanup"><i data-lucide="shield-alert" style="width: 12px; height: 12px;"></i> Limpar Conflitos</button>
                        </div>
                    </div>

                    <div class="terminal-container">
                        <div class="terminal-header">
                            <div class="terminal-title"><i data-lucide="terminal" style="width: 12px; height: 12px;"></i> Runtime Logs</div>
                            <span id="log-count" class="log-count">0 logs</span>
                        </div>
                        <div id="logs" class="console-body"></div>
                    </div>
                </div>
            </div>

            <script>
                // Initialize Lucide icons
                lucide.createIcons();

                async function updateStatus() {
                    const res = await fetch('/status');
                    const data = await res.json();
                    const status = document.getElementById('status');
                    const startBtn = document.getElementById('start');
                    const stopBtn = document.getElementById('stop');
                    
                    if (data.active) {
                        status.innerText = 'ONLINE';
                        status.className = 'status-badge status-on';
                        startBtn.disabled = true;
                        stopBtn.disabled = false;
                    } else {
                        status.innerText = 'OFFLINE';
                        status.className = 'status-badge status-off';
                        startBtn.disabled = false;
                        stopBtn.disabled = true;
                    }
                }

                function getLogClass(content) {
                    if (content.includes('🚀') || content.includes('✅')) return 'system';
                    if (content.includes('🛑') || content.includes('⚠️') || content.includes('error') || content.includes('Erro')) return 'error';
                    return '';
                }

                async function fetchLogs() {
                    const res = await fetch('/get-logs');
                    const data = await res.json();
                    const logsDiv = document.getElementById('logs');
                    const logCountLabel = document.getElementById('log-count');
                    
                    logCountLabel.innerText = data.length + ' logs';
                    
                    // Only update if logs changed to avoid flicker
                    const currentHtml = data.reverse().map(l => `
        < div class= "log-line" >
                            <span class="log-time">${l.time}</span>
                            <span class="log-content ${getLogClass(l.content)}">${l.content}</span>
                        </div >
        `).join('');
                    
                    if (logsDiv.innerHTML !== currentHtml) {
                        logsDiv.innerHTML = currentHtml;
                    }
                }

                document.getElementById('start').onclick = () => fetch('/start', { method: 'POST' }).then(() => updateStatus());
                document.getElementById('stop').onclick = () => fetch('/stop', { method: 'POST' }).then(() => updateStatus());
                document.getElementById('restart').onclick = () => fetch('/restart', { method: 'POST' }).then(() => updateStatus());
                document.getElementById('cleanup').onclick = async () => {
                    if (confirm('Isso vai encerrar TODOS os processos de bot rodando no sistema. Continuar?')) {
                        await fetch('/cleanup', { method: 'POST' });
                        updateStatus();
                    }
                };

                setInterval(updateStatus, 2000);
                setInterval(fetchLogs, 2000);
                updateStatus();
                fetchLogs();
            </script>
        </body>
        </html>
    `);
});

app.get('/status', auth, (req, res) => {
    res.json({ active: !!workerProcess });
});

app.get('/get-logs', auth, (req, res) => {
    res.json(logs);
});

app.post('/start', auth, (req, res) => {
    startWorker();
    res.json({ success: true });
});

app.post('/stop', auth, (req, res) => {
    stopWorker().then(() => res.json({ success: true }));
});

app.post('/restart', auth, async (req, res) => {
    await stopWorker();
    startWorker();
    res.json({ success: true });
});

app.post('/cleanup', auth, async (req, res) => {
    await stopWorker();
    await cleanupSystem();
    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`\n🚀 Painel SaaS rodando em http://localhost:${PORT}`);
    console.log(`🔑 Senha padrão: ${PASSWORD}\n`);
});
