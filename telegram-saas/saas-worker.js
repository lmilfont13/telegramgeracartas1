const { createClient } = require('@supabase/supabase-js');
const TelegramBot = require('node-telegram-bot-api');
// Tenta carregar .env.local apenas localmente
const fs = require('fs');
if (fs.existsSync('.env.local')) {
    require('dotenv').config({ path: '.env.local' });
}

// Debug: Lista os nomes das variáveis disponíveis (sem os valores por segurança)
console.log("--- Diagnóstico de Ambiente Completo ---");
console.log("Todas as chaves detectadas:", Object.keys(process.env));
console.log("Filtro SUPABASE/NEXT_PUBLIC:", Object.keys(process.env).filter(k => k.includes('SUPABASE') || k.includes('NEXT_PUBLIC')));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ ERRO: Variáveis de ambiente Supabase (URL ou KEY) não encontradas.");
    console.error("Chaves esperadas: NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (ou NEXT_PUBLIC_SUPABASE_ANON_KEY)");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log(`[Init] Usando chave Supabase: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SERVICE_ROLE (Admin)' : 'ANON (Pública)'}`);


const { generateSaaSPDF } = require('./saas-pdf-generator');

// Armazena instâncias de bots ativos: { [botId]: TelegramBotInstance }
const activeBots = {};
// Lock para evitar execuções simultâneas
let isSyncing = false;

// ID único desta instância (para detectar duplicidade/split-brain)
const INSTANCE_ID = Math.random().toString(36).substring(7).toUpperCase();
console.log(`🆔 Instance ID: ${INSTANCE_ID}`);


// Gerenciador de Estados dos Usuários
// { [chatId]: { step: 'IDLE', data: { funcionario, templateId, empresaId, stampPosition, customCoords: { x, y } } } }
const userStates = {};

const STEPS = {
    IDLE: 'IDLE',
    SELECTING_TEMPLATE: 'SELECTING_TEMPLATE',
    SELECTING_COMPANY: 'SELECTING_COMPANY',
    SELECTING_LOJA: 'SELECTING_LOJA',
    SELECTING_POSITION: 'SELECTING_POSITION',
    AWAITING_CUSTOM_X: 'AWAITING_CUSTOM_X',
    AWAITING_CUSTOM_Y: 'AWAITING_CUSTOM_Y'
};

/**
 * Downloads a file from Supabase Storage using the client
 * @param {string} publicUrl 
 * @returns {Promise<Buffer|null>}
 */
/**
 * Downloads a file from a URL (Supabase Storage or any public URL)
 * @param {string} publicUrl 
 * @returns {Promise<Buffer|null>}
 */
async function downloadImageFromSupabase(publicUrl) {
    if (!publicUrl) return null;

    try {
        console.log(`[Storage] Tentando baixar imagem via Client: ${publicUrl}`);

        // Extrai bucket e path da URL pública
        // Ex: https://.../storage/v1/object/public/logos/693dd2d3-271d-4f53-8f6e-375bdb3d21a9/logo.png
        const urlParts = publicUrl.split('/public/');
        if (urlParts.length <= 1) {
            console.error(`[Storage] URL malformada para o Supabase: ${publicUrl}`);
            return null;
        }

        const fullPath = urlParts[1];
        const bucket = fullPath.split('/')[0];
        const path = fullPath.substring(bucket.length + 1);

        const { data, error } = await supabase.storage.from(bucket).download(path);

        if (error) {
            throw error;
        }

        const arrayBuffer = await data.arrayBuffer();
        return Buffer.from(arrayBuffer);

    } catch (e) {
        console.error(`[Storage] Erro ao baixar imagem (${publicUrl}):`, e.message);
        return null;
    }
}

// Função para extrair campos de forma inteligente dos dados extras
function extractField(funcionario, type) {
    const extras = funcionario.dados_extras || {};
    const normalize = (s) => String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

    const mapping = {
        nome: {
            keys: ['nome', 'funcionario', 'colaborador', 'completo', 'funcionarios'],
            blacklist: ['cpf', 'rg', 'id', 'cod', 'conta', 'nascimento', 'data', 'inicio', 'admissao'],
            valueCheck: (v) => v && v.length > 3 && !/^\d{7,}$/.test(v.replace(/[\.\-\/]/g, '')) && v.includes(' ')
        },
        loja: {
            keys: ['loja', 'unidade', 'filial', 'ponto', 'pdv', 'local', 'cidade', 'estado', 'uf', 'cdc'],
            blacklist: [],
            valueCheck: (v) => v && v.length >= 2
        },
        cargo: {
            keys: ['cargo', 'funcao', 'ocupacao', 'atividade', 'natureza'],
            blacklist: [],
            valueCheck: (v) => v && v.length >= 2
        },
        rg: {
            keys: ['rg', 'identidade'],
            blacklist: [],
            valueCheck: (v) => v && v.length >= 5
        },
        cpf: {
            keys: ['cpf', 'documento'],
            blacklist: [],
            valueCheck: (v) => v && v.length >= 11
        },
        empresa: {
            keys: ['empresa', 'companhia', 'razao', 'contratante'],
            blacklist: [],
            valueCheck: (v) => v && v.length >= 3
        },
        cdc: {
            keys: ['cdc', 'centro', 'custo'],
            blacklist: [],
            valueCheck: (v) => v && v.length >= 2
        }
    };

    const config = mapping[type];
    if (!config) return '';

    // 0. Tenta o campo direto da tabela primeiro
    if (funcionario[type] && funcionario[type].length >= 2 && funcionario[type] !== 'Sem Nome') {
        return funcionario[type];
    }

    // 1. Tenta por chaves no dados_extras (respeitando a ordem de prioridade em config.keys)
    for (const keyPattern of config.keys) {
        for (const actualKey of Object.keys(extras)) {
            const normKey = normalize(actualKey);
            if (normKey.includes(keyPattern) && !config.blacklist.some(bk => normKey.includes(bk))) {
                const val = String(extras[actualKey]).trim();
                // Se o campo for 'loja' e o valor tiver apenas 2 letras (ex: UF), continua procurando algo melhor
                if (type === 'loja' && val.length === 2 && config.keys.indexOf(keyPattern) > 5) {
                    continue;
                }
                if (config.valueCheck(val)) {
                    console.log(`[extractField] Found '${type}' in key '${actualKey}': '${val}'`);
                    return val;
                }
            }
        }
    }
    console.log(`[extractField] Could not find field '${type}' in extras:`, Object.keys(extras));
    return funcionario[type] || '';
}

// Função para extrair nome (mantida por compatibilidade ou simplificada)
function extractName(f) { return extractField(f, 'nome') || 'Funcionário'; }

// Função para processar o template com dados do funcionário
function renderTemplate(template, funcionario, botData) {
    // Limpeza radical de caracteres de controle e codificação
    let text = template
        .replace(/\r/g, '') // Remove carriage returns (\r)
        .replace(/\u00D0/g, '') // Remove o caractere "Ð" específico
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '') // Remove controles não-imprimíveis
        .trim();

    const placeholders = {
        '{{NOME}}': extractField(funcionario, 'nome'),
        '{{LOJA}}': botData.loja_selecionada || extractField(funcionario, 'loja'),
        '{{CARGO}}': extractField(funcionario, 'cargo'),
        '{{RG}}': extractField(funcionario, 'rg'),
        '{{CPF}}': extractField(funcionario, 'cpf'),
        '{{EMPRESA}}': botData.nome_empresa || extractField(funcionario, 'empresa'),
        '{{CDC}}': extractField(funcionario, 'cdc'),
        '{{DATA}}': new Date().toLocaleDateString('pt-BR'),
        '{{NOME_FUNCIONARIO}}': extractField(funcionario, 'nome'),
        '{{DATA_ATUAL}}': new Date().toLocaleDateString('pt-BR'),
        '{{DATA_ADMISSAO}}': funcionario.data_admissao ? new Date(funcionario.data_admissao).toLocaleDateString('pt-BR') : '-'
    };

    console.log(`[Bot ${botData.nome}] Valores dos Placeholders:`, JSON.stringify(placeholders, null, 2));

    for (const [key, value] of Object.entries(placeholders)) {
        // Remove as chaves para criar a regex e torná-la case-insensitive
        const pattern = key.replace('{{', '\\{\\{').replace('}}', '\\}\\}');
        text = text.replace(new RegExp(pattern, 'gi'), value || '');
    }
    return text;
}

// Função para iniciar um bot
function startBot(botData) {
    if (activeBots[botData.id]) {
        return;
    }

    try {
        console.log(`🚀 Iniciando Bot: ${botData.nome} (Token: ${botData.token_telegram ? botData.token_telegram.substring(0, 10) : 'MISSING'}...)`);

        if (!botData.token_telegram) {
            console.error(`❌ Bot ${botData.nome} sem token!`);
            return;
        }

        const bot = new TelegramBot(botData.token_telegram, { polling: true });
        activeBots[botData.id] = bot;
        console.log(`✅ Bot ${botData.nome} instanciado com sucesso.`);

        // Lógica de Mensagem
        // Lógica de Mensagem (Comandos e Texto Livre)
        bot.on('message', async (msg) => {
            const chatId = msg.chat.id;
            const text = msg.text;
            if (!text) return;

            // Inicializa estado se não existir
            if (!userStates[chatId]) {
                userStates[chatId] = { step: STEPS.IDLE, data: {} };
            }
            const state = userStates[chatId];

            console.log(`[Bot ${botData.nome}] (${state.step}) Mensagem de ${msg.from.first_name}: "${text}"`);

            // COMANDOS GLOBAIS
            if (text === '/start' || text === '/reiniciar') {
                state.step = STEPS.SELECTING_COMPANY;
                state.data = {};
                console.log(`[Bot ${botData.nome}] Resetando estado para SELECTING_COMPANY via ${text}`);

                // Busca empresas disponíveis
                try {
                    console.log(`[Bot ${botData.nome}] DEBUG: Buscando empresas...`);
                    const { data: empresas, error: empErr } = await supabase.from('empresas').select('id, nome').order('nome');

                    if (empErr) throw empErr;
                    console.log(`[Bot ${botData.nome}] DEBUG: Empresas encontradas: ${empresas?.length}`);

                    if (!empresas || empresas.length === 0) {
                        return bot.sendMessage(chatId, "❌ Nenhuma empresa cadastrada no sistema.");
                    }

                    const buttons = empresas.map(emp => ([{ text: emp.nome, callback_data: `e:${emp.id}` }]));

                    console.log(`[Bot ${botData.nome}] DEBUG: Enviando mensagem...`);
                    return bot.sendMessage(chatId, `🏢 **Selecione a Empresa** para iniciar:`, {
                        parse_mode: 'Markdown',
                        reply_markup: { inline_keyboard: buttons }
                    });
                } catch (err) {
                    console.error(`[Bot ${botData.nome}] Erro ao carregar empresas:`, err);
                    return bot.sendMessage(chatId, "❌ Erro ao conectar com o banco de dados. Tente novamente mais tarde.");
                }
            }

            if (text === '/ajuda') {
                return bot.sendMessage(chatId,
                    '*📄 Gerador de Carta de Apresentação*\n\n' +
                    '1️⃣ Use /start para iniciar\n' +
                    '2️⃣ Selecione a empresa\n' +
                    '3️⃣ Pesquise o funcionário pelo nome\n' +
                    '4️⃣ Informe o nome da Loja/Unidade\n' +
                    '5️⃣ Escolha o modelo e a posição dos carimbos\n\n' +
                    '*Comandos:*\n' +
                    '/start - Iniciar processo\n' +
                    '/reiniciar - Reiniciar do zero\n' +
                    '/cancelar - Parar operação atual\n' +
                    '/ajuda - Mostrar esta mensagem',
                    { parse_mode: 'Markdown' }
                );
            }

            if (text === '/cancelar') {
                state.step = STEPS.IDLE;
                state.data = {};
                return bot.sendMessage(chatId, "❌ Operação cancelada. Use /start para começar novamente.");
            }

            if (text === '/ping') {
                const uptime = process.uptime();
                const memory = process.memoryUsage();
                const memUsed = Math.round(memory.heapUsed / 1024 / 1024);
                return bot.sendMessage(chatId, `🏓 **Pong!**\n\n🆔 Instância: \`${INSTANCE_ID}\`\n🕒 Uptime: ${Math.floor(uptime)}s\n💾 Memória: ${memUsed}MB\n🚀 Versão: ${process.version}`, { parse_mode: 'Markdown' });
            }


            // Se estiver selecionando LOJA (Texto Livre)
            if (state.step === STEPS.SELECTING_LOJA) {
                state.data.loja_selecionada = text;
                state.step = STEPS.SELECTING_TEMPLATE;

                const empresaId = state.data.empresaId;
                const { data: templates } = await supabase.from('templates').select('id, nome').or(`empresa_id.eq.${empresaId},empresa_id.is.null`);

                if (!templates || templates.length === 0) {
                    return bot.sendMessage(chatId, `❌ Nenhum modelo de carta encontrado.`);
                }

                const buttons = templates.map(t => ([{ text: `📄 ${t.nome}`, callback_data: `t:${t.id}` }]));
                return bot.sendMessage(chatId, `Loja **${text}** definida.\n\nEscolha o **Modelo da Carta**:`, {
                    parse_mode: 'Markdown',
                    reply_markup: { inline_keyboard: buttons }
                });
            }

            // Se estiver coletando coordenadas personalizadas
            if (state.step === STEPS.AWAITING_CUSTOM_X) {
                const x = parseInt(text);
                if (isNaN(x)) return bot.sendMessage(chatId, "Por favor, digite um número válido para a largura (X):");
                state.data.customCoords = { x };
                state.step = STEPS.AWAITING_CUSTOM_Y;
                return bot.sendMessage(chatId, "Agora digite a **altura (Y)** (ex: 600):");
            }

            if (state.step === STEPS.AWAITING_CUSTOM_Y) {
                const y = parseInt(text);
                if (isNaN(y)) return bot.sendMessage(chatId, "Por favor, digite um número válido para a altura (Y):");
                state.data.customCoords.y = y;
                state.data.stampPosition = 'personalizado';
                // Finaliza e gera PDF
                return generateAndSendPDF(bot, chatId, state.data, botData);
            }

            // Comportamento Padrão: Busca de Funcionário
            // Agora só busca se estiver no passo IDLE (pós seleção de empresa)
            if (state.step === STEPS.IDLE) {
                // Se não tem empresa selecionada, avisa
                if (!state.data.empresaId) {
                    return bot.sendMessage(chatId, "⚠️ Por favor, digite /start e selecione uma empresa primeiro.");
                }

                bot.sendChatAction(chatId, 'typing');

                // 1. Tentativa de Busca EXATA primeiro
                let { data: results, error } = await supabase
                    .from('funcionarios')
                    .select('*')
                    .eq('empresa_id', state.data.empresaId)
                    .ilike('nome', text); // Busca exata (case insensitive)

                // 2. Se não achou exato, tenta parcial (LIKE)
                if (!results || results.length === 0) {
                    const { data: partialResults, error: partialError } = await supabase
                        .from('funcionarios')
                        .select('*')
                        .eq('empresa_id', state.data.empresaId)
                        .ilike('nome', `%${text}%`); // Busca parcial

                    if (partialError) {
                        console.error("Erro busca parcial:", partialError);
                        return bot.sendMessage(chatId, "Erro ao buscar no banco.");
                    }
                    results = partialResults || [];
                }

                if (error) {
                    console.error("Erro busca exata:", error);
                    return bot.sendMessage(chatId, "Erro ao buscar no banco.");
                }

                if (!results || results.length === 0) {
                    // Tenta buscar nos dados extras se falhar no nome principal (Fallback final)
                    const { data: extraResults } = await supabase
                        .from('funcionarios')
                        .select('*')
                        .eq('empresa_id', state.data.empresaId)
                        .limit(100);

                    const foundInExtras = extraResults?.filter(f =>
                        JSON.stringify(f.dados_extras).toLowerCase().includes(text.toLowerCase())
                    );

                    if (foundInExtras && foundInExtras.length > 0) {
                        return handleResults(bot, chatId, foundInExtras, botData);
                    }
                    return bot.sendMessage(chatId, `❌ Nenhum funcionário encontrado com "${text}" na empresa selecionada.`);
                }

                // Se encontrou, processa
                return handleResults(bot, chatId, results, botData);
            }

            // Resposta padrão se nada acima capturou a mensagem
            if (state.step === STEPS.IDLE && !state.data.empresaId) {
                return bot.sendMessage(chatId, "👋 Olá! Use /start para começar a gerar uma carta de apresentação.");
            } else if (state.step !== STEPS.IDLE) {
                // Se estiver em um passo mas mandou algo que não processamos
                console.log(`[Bot ${botData.nome}] Mensagem ignorada no estado ${state.step}: "${text}"`);
                // Opcional: Avisar o usuário dependendo do estado
            }
        });

        // Lógica de Cliques nos Botões (Callback Query)
        bot.on('callback_query', async (query) => {
            const chatId = query.message.chat.id;
            const data = query.data; // Formato 'tipo:id'

            if (!userStates[chatId]) return;
            const state = userStates[chatId];

            const [type, value] = data.split(':');

            // 1. Seleção de Empresa (Agora é o PRIMEIRO passo)
            if (type === 'e') {
                // Salva a empresa selecionada
                state.data.empresaId = value;

                // Avança para o passo de busca de funcionário
                state.step = STEPS.IDLE; // Usando IDLE como "aguardando busca"

                const { data: empresa } = await supabase.from('empresas').select('nome').eq('id', value).single();
                const nomeEmpresa = empresa ? empresa.nome : 'Selecionada';

                // Salva nome da empresa no estado para usar nos placeholders
                state.data.nome_empresa = nomeEmpresa;

                return bot.editMessageText(`🏢 Empresa **${nomeEmpresa}** definida.\n\n🔍 Agora digite o **nome do funcionário** para buscar:`, {
                    chat_id: chatId,
                    message_id: query.message.message_id,
                    parse_mode: 'Markdown'
                });
            }

            // 0. Seleção de Funcionário (da lista de busca)
            if (type === 'f') {
                const { data: func, error } = await supabase.from('funcionarios').select('*').eq('id', value).single();
                if (error || !func) {
                    return bot.answerCallbackQuery(query.id, { text: "Erro ao selecionar funcionário.", show_alert: true });
                }

                // Simula o comportamento de ter encontrado apenas 1 resultado
                return handleResults(bot, chatId, [func], botData);
            }

            // 2. Seleção de Template (Agora é o SEGUNDO passo)
            if (type === 't') {
                state.data.templateId = value;
                state.step = STEPS.SELECTING_POSITION;

                const buttons = [
                    [{ text: '↔️ Ambos', callback_data: 'p:ambos' }],
                    [{ text: '📍 Personalizado (X/Y)', callback_data: 'p:personalizado' }]
                ];

                return bot.editMessageText("Onde deseja posicionar os **Carimbos**?", {
                    chat_id: chatId,
                    message_id: query.message.message_id,
                    reply_markup: { inline_keyboard: buttons }
                });
            }

            // 3. Seleção de Posição
            if (type === 'p') {
                if (value === 'personalizado') {
                    state.step = STEPS.AWAITING_CUSTOM_X;
                    bot.answerCallbackQuery(query.id);
                    return bot.sendMessage(chatId, "Digite a **largura (X)** desejada (ex: 72 para esquerda, 400 para direita):");
                } else {
                    state.data.stampPosition = value;
                    state.data.customCoords = null;
                    bot.answerCallbackQuery(query.id);
                    return generateAndSendPDF(bot, chatId, state.data, botData);
                }
            }
        });

        // Tratamento de erro de polling
        bot.on('polling_error', (error) => {
            // Log apenas códigos críticos ou novos
            if (error.code === 'EFATAL') {
                console.error(`[Bot ${botData.nome}] Erro FATAL de Polling:`, error);
                stopBot(botData.id);
            } else if (error.code === 'ETELEGRAM') {
                if (error.message.includes('401') || error.message.includes('404')) {
                    console.error(`[Bot ${botData.nome}] Token Inválido (401/404). Parando.`);
                    stopBot(botData.id);
                } else if (error.message.includes('409')) {
                    console.warn(`[Bot ${botData.nome}] Conflito de Polling (409). Outra instância rodando.`);
                } else {
                    console.error(`[Bot ${botData.nome}] Erro Telegram Polling:`, error.message);
                }
            } else {
                console.warn(`[Bot ${botData.nome}] Polling error (${error.code}):`, error.message);
            }
        });

    } catch (e) {
        console.error(`❌ Erro ao iniciar bot ${botData.nome}:`, e);
    }
}

// Função para processar resultados da busca e iniciar fluxo
async function handleResults(bot, chatId, results, botData) {
    // SE tiver mais de 1 resultado, OBRIGA o usuário a escolher
    if (results.length > 1) {
        // Múltiplos resultados - mostra botões de desambiguação
        const buttons = results.slice(0, 5).map(f => ([{ text: `${extractName(f)} - ${extractField(f, 'cargo')}`, callback_data: `f:${f.id}` }]));

        await bot.sendMessage(chatId, `🔍 Encontrei **${results.length}** funcionários similares. Por favor, clique no correto:`, {
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: buttons }
        });
        return;
    }

    if (results.length === 1) {
        const funcionario = results[0];
        const nomeExibicao = extractName(funcionario);

        // Inicia fluxo interativo - AGORA PERGUNTA A LOJA PRIMEIRO
        userStates[chatId] = {
            step: STEPS.SELECTING_LOJA,
            data: {
                ...userStates[chatId].data,
                funcionario,
                nomeExibicao
            }
        };

        return bot.sendMessage(chatId, `Funcionário encontrado: **${nomeExibicao}**.\n\n📍 Para qual **LOJA / UNIDADE** deseja gerar esta carta?\n\n(Digite o nome da loja abaixo)`);
    }
}

// Função Final de Geração
async function generateAndSendPDF(bot, chatId, data, botData) {
    bot.sendMessage(chatId, "⏳ Gerando seu PDF personalizado...");
    bot.sendChatAction(chatId, 'upload_document');

    try {
        const { funcionario, templateId, empresaId, stampPosition, customCoords, nomeExibicao } = data;

        // 1. Busca Template selecionado
        const { data: templateData } = await supabase.from('templates').select('*').eq('id', templateId).single();
        const templateText = templateData?.conteudo || "Olá {{NOME}}, ...";

        // 2. Busca Empresa selecionada (para Logo/Carimbos)
        const { data: empresa } = await supabase.from('empresas').select('*').eq('id', empresaId).single();

        // 3. Renderiza Texto
        const botDataWithSelectedCompany = {
            ...botData,
            empresa_id: empresa.id,
            nome_empresa: empresa.nome,
            loja_selecionada: data.loja_selecionada
        };
        const finalContent = renderTemplate(templateText, funcionario, botDataWithSelectedCompany);

        // 4. Download de Imagens
        const logoBuffer = await downloadImageFromSupabase(empresa.logo_url);
        const carimbo1Buffer = await downloadImageFromSupabase(empresa.carimbo_url);
        const carimbo2Buffer = await downloadImageFromSupabase(empresa.carimbo_funcionario_url);

        // 5. Geração PDF
        const pdfBuffer = await generateSaaSPDF({
            text: finalContent,
            logoUrl: logoBuffer,
            carimbo1Url: carimbo1Buffer,
            carimbo2Url: carimbo2Buffer,
            stampPosition,
            customCoords
        });

        // 6. Envio
        await bot.sendDocument(chatId, pdfBuffer, {
            caption: `✅ Carta de **${nomeExibicao}** gerada com sucesso!`
        }, {
            filename: `Carta_${nomeExibicao.replace(/\s+/g, '_')}.pdf`,
            contentType: 'application/pdf'
        });

        // 7. Registrar no histórico
        try {
            await supabase.from('cartas_geradas').insert({
                bot_id: botData.id,
                empresa_id: empresaId,
                funcionario_id: funcionario.id,
                template_id: templateId,
                nome_arquivo: `Carta_${nomeExibicao.replace(/\s+/g, '_')}.pdf`,
                nome_funcionario: nomeExibicao
            });
            console.log(`[Bot ${botData.nome}] Registro de geração salvo no banco.`);
        } catch (dbErr) {
            console.error(`[Bot ${botData.nome}] Erro ao salvar histórico:`, dbErr);
        }

        // Limpa estado
        userStates[chatId] = { step: STEPS.IDLE, data: {} };

    } catch (e) {
        console.error(`[Bot ${botData.nome}] Erro na geração final:`, e);
        bot.sendMessage(chatId, "❌ Erro ao finalizar o PDF. Tente novamente com /start.");
        userStates[chatId] = { step: STEPS.IDLE, data: {} };
    }
}

function stopBot(botId) {
    const bot = activeBots[botId];
    if (bot) {
        bot.stopPolling();
        delete activeBots[botId];
    }
}

// Loop principal de atualização
async function syncBots() {
    if (isSyncing) return;
    isSyncing = true;

    try {
        console.log("🔍 Sincronizando bots...");

        const { data: bots, error } = await supabase
            .from('bots')
            .select('*')
            .eq('ativo', true);

        if (error) {
            console.error("Erro ao buscar bots:", error.message);
            return;
        }

        console.log(`🤖 Encontrados ${bots.length} bots ativos.`);

        // Iniciar novos bots
        for (const botData of bots) {
            if (!activeBots[botData.id]) {
                startBot(botData);
            }
        }

        // Parar bots removidos
        const activeIds = Object.keys(activeBots);
        for (const id of activeIds) {
            if (!bots.find(b => b.id === id)) {
                console.log(`🛑 Parando bot ${id} removido do banco.`);
                stopBot(id);
            }
        }

        console.log(`✅ Total de bots rodando: ${Object.keys(activeBots).length}`);
        if (Object.keys(activeBots).length > 0) {
            console.log(`[Diagnostic] Bots ativos: ${Object.keys(activeBots).map(id => activeBots[id].options?.username || 'Unknown').join(', ')}`);
        }
    } catch (e) {
        console.error("💥 Erro em syncBots:", e);
    } finally {
        isSyncing = false;
    }
}

// Iniciar
console.log("🤖 SaaS Bot Engine Iniciado!");

process.on('uncaughtException', (err) => {
    console.error('💥 ERRO FATAL (Uncaught Exception):', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 ERRO FATAL (Unhandled Rejection) em:', promise, 'razão:', reason);
});

syncBots();

// Sincronizar a cada 60 segundos
// Sincronizar a cada 60 segundos
setInterval(syncBots, 60000);

// Graceful Shutdown
const shutdown = (signal) => {
    console.log(`🛑 Recebido ${signal}. Encerrando bots...`);
    Object.keys(activeBots).forEach(id => stopBot(id));
    setTimeout(() => {
        console.log('👋 Adeus!');
        process.exit(0);
    }, 1000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
