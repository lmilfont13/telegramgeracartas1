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
            <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600&display=swap" rel="stylesheet">
            <style>
                body { margin: 0; padding: 0; font-family: 'Outfit', sans-serif; height: 100vh; display: flex; align-items: center; justify-content: center; background: #0f172a; color: white; }
                .card { background: rgba(30, 41, 59, 0.7); backdrop-filter: blur(12px); padding: 2.5rem; border-radius: 1.5rem; border: 1px solid rgba(255,255,255,0.1); width: 100%; max-width: 350px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); text-align: center; }
                h1 { margin-bottom: 2rem; font-weight: 600; font-size: 1.8rem; background: linear-gradient(to right, #60a5fa, #c084fc); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
                input { width: 100%; padding: 0.8rem; margin-bottom: 1.5rem; border-radius: 0.75rem; border: 1px solid rgba(255,255,255,0.1); background: rgba(15, 23, 42, 0.5); color: white; box-sizing: border-box; font-size: 1rem; transition: border-color 0.3s; }
                input:focus { outline: none; border-color: #60a5fa; }
                button { width: 100%; padding: 0.8rem; border-radius: 0.75rem; border: none; background: linear-gradient(to right, #3b82f6, #8b5cf6); color: white; font-weight: 600; font-size: 1rem; cursor: pointer; transition: transform 0.2s, opacity 0.2s; }
                button:hover { opacity: 0.9; transform: translateY(-2px); }
                .error { color: #f87171; margin-bottom: 1rem; font-size: 0.9rem; }
            </style>
        </head>
        <body>
            <div class="card">
                <h1>Painel SaaS</h1>
                <form action="/login" method="POST">
                    <input type="password" name="password" placeholder="Senha de Acesso" autofocus required>
                    <button type="submit">Entrar</button>
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
            <title>Painel de Controle SaaS</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600&display=swap" rel="stylesheet">
            <style>
                body { margin: 0; padding: 0; font-family: 'Outfit', sans-serif; background: #0f172a; color: white; min-height: 100vh; padding: 2rem; box-sizing: border-box; }
                .container { max-width: 900px; margin: 0 auto; }
                header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
                h1 { margin: 0; font-weight: 600; background: linear-gradient(to right, #60a5fa, #c084fc); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
                .status-badge { padding: 0.4rem 1rem; border-radius: 2rem; font-size: 0.85rem; font-weight: 600; background: rgba(30, 41, 59, 0.5); border: 1px solid rgba(255,255,255,0.1); }
                .status-on { border-color: #22c55e; color: #22c55e; box-shadow: 0 0 10px rgba(34, 197, 94, 0.2); }
                .status-off { border-color: #ef4444; color: #ef4444; }
                
                .grid { display: grid; grid-template-columns: 1fr 2fr; gap: 2rem; }
                @media (max-width: 768px) { .grid { grid-template-columns: 1fr; } }
                
                .panel { background: rgba(30, 41, 59, 0.5); backdrop-filter: blur(8px); border-radius: 1.25rem; border: 1px solid rgba(255,255,255,0.05); padding: 1.5rem; }
                .controls { display: flex; flex-direction: column; gap: 1rem; }
                
                button { padding: 0.8rem; border-radius: 0.75rem; border: none; font-weight: 600; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 0.5rem; font-size: 0.95rem; }
                button:hover { filter: brightness(1.1); transform: translateY(-2px); }
                button:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
                
                .btn-start { background: #22c55e; color: white; }
                .btn-stop { background: #ef4444; color: white; }
                .btn-restart { background: #3b82f6; color: white; }
                .btn-cleanup { background: rgba(100, 116, 139, 0.5); color: #cbd5e1; border: 1px solid #64748b; margin-top: 1rem; }
                .btn-logout { background: transparent; color: #94a3b8; border: 1px solid #334155; font-size: 0.8rem; padding: 0.4rem 0.8rem; }
                
                .console { background: #020617; border-radius: 0.75rem; border: 1px solid #1e293b; height: 400px; display: flex; flex-direction: column; }
                .console-header { padding: 0.75rem 1rem; border-bottom: 1px solid #1e293b; display: flex; justify-content: space-between; color: #94a3b8; font-size: 0.8rem; }
                .console-body { flex: 1; padding: 1rem; overflow-y: auto; font-family: 'Courier New', monospace; font-size: 0.85rem; display: flex; flex-direction: column-reverse; }
                .log-line { margin-bottom: 0.4rem; border-left: 2px solid #334155; padding-left: 0.6rem; }
                .log-time { color: #475569; margin-right: 0.5rem; font-size: 0.75rem; }
                .log-content { color: #e2e8f0; }

                /* Custom Scrollbar */
                ::-webkit-scrollbar { width: 6px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 3px; }
            </style>
        </head>
        <body>
            <div class="container">
                <header>
                    <div>
                        <h1>SaaS Engine</h1>
                        <p style="color: #64748b; margin: 0.2rem 0 0 0; font-size: 0.9rem;">Gerador de Cartas v3.1</p>
                    </div>
                    <div style="display: flex; align-items: center; gap: 1rem;">
                        <div id="status" class="status-badge status-off">OFFLINE</div>
                        <a href="/logout"><button class="btn-logout">Sair</button></a>
                    </div>
                </header>

                <div class="grid">
                    <div class="panel">
                        <h3 style="margin-top: 0;">Controles</h3>
                        <div class="controls">
                            <button id="start" class="btn-start">🚀 Iniciar</button>
                            <button id="stop" class="btn-stop">🛑 Parar</button>
                            <button id="restart" class="btn-restart">🔄 Reiniciar</button>
                            <hr style="border: 0; border-top: 1px solid rgba(255,255,255,0.05); margin: 0.5rem 0;">
                            <button id="cleanup" class="btn-cleanup">🛠️ Limpar Conflitos</button>
                        </div>
                    </div>

                    <div class="panel" style="padding: 1rem;">
                        <div class="console">
                            <div class="console-header">
                                <span>TERMINAL</span>
                                <span id="log-count">0 logs</span>
                            </div>
                            <div id="logs" class="console-body"></div>
                        </div>
                    </div>
                </div>
            </div>

            <script>
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

                async function fetchLogs() {
                    const res = await fetch('/get-logs');
                    const data = await res.json();
                    const logsDiv = document.getElementById('logs');
                    const logCount = document.getElementById('log-count');
                    
                    logCount.innerText = data.length + ' logs';
                    logsDiv.innerHTML = data.reverse().map(l => \`
                        <div class="log-line">
                            <span class="log-time">[\${l.time}]</span>
                            <span class="log-content">\${l.content}</span>
                        </div>
                    \`).join('');
                }

                document.getElementById('start').onclick = () => fetch('/start', { method: 'POST' });
                document.getElementById('stop').onclick = () => fetch('/stop', { method: 'POST' });
                document.getElementById('restart').onclick = () => fetch('/restart', { method: 'POST' });
                document.getElementById('cleanup').onclick = async () => {
                    if (confirm('Isso vai encerrar TODOS os processos de bot rodando no sistema. Continuar?')) {
                        await fetch('/cleanup', { method: 'POST' });
                    }
                };

                setInterval(updateStatus, 1000);
                setInterval(fetchLogs, 1000);
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
