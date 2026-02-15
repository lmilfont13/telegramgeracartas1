require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { generatePDF } = require('./pdfGenerator');
const fs = require('fs');
const path = require('path');

const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

// Carregar cadastro de funcionários
let funcionarios = [];
try {
    const funcionariosData = fs.readFileSync(path.join(__dirname, 'funcionarios.json'), 'utf8');
    funcionarios = JSON.parse(funcionariosData).funcionarios;
} catch (error) {
    console.warn('⚠️ Arquivo funcionarios.json não encontrado. Sistema de cadastro desabilitado.');
}

// Carregar modelos de cartas
let modelos = [];
try {
    const modelosData = fs.readFileSync(path.join(__dirname, 'modelos.json'), 'utf8');
    modelos = JSON.parse(modelosData).modelos;
    console.log(`✅ ${modelos.length} modelos carregados`);
} catch (error) {
    console.warn('⚠️ Arquivo modelos.json não encontrado. Sistema de modelos desabilitado.');
}

// Armazena o estado da conversa de cada usuário
const userStates = {};

// Estados possíveis
const STATES = {
    WAITING_REMETENTE: 'WAITING_REMETENTE',
    WAITING_MODEL_CHOICE: 'WAITING_MODEL_CHOICE',
    WAITING_CUSTOM_TEXT: 'WAITING_CUSTOM_TEXT',
    WAITING_PLACEHOLDERS: 'WAITING_PLACEHOLDERS',
    WAITING_CONFIRMATION: 'WAITING_CONFIRMATION',
    IDLE: 'IDLE'
};

// Função para buscar funcionário por nome (busca parcial)
function buscarFuncionario(nome) {
    const nomeLower = nome.toLowerCase().trim();
    return funcionarios.find(f =>
        f.nome.toLowerCase().includes(nomeLower) ||
        nomeLower.includes(f.nome.toLowerCase())
    );
}

// Função para listar funcionários disponíveis
function listarFuncionarios() {
    if (funcionarios.length === 0) return 'Nenhum funcionário cadastrado.';

    // Mostrar apenas os primeiros 10 e total
    const preview = funcionarios.slice(0, 10).map((f, i) => `${i + 1}. ${f.nome} - ${f.cargo}`).join('\n');

    return `📊 **Total: ${funcionarios.length} funcionários cadastrados**\n\n` +
        `📋 Primeiros 10:\n${preview}\n\n` +
        `... e mais ${funcionarios.length - 10} funcionários.\n\n` +
        `💡 *Como usar:*\n` +
        `Use /start e digite o nome do funcionário para buscar automaticamente!`;
}

// Função para buscar modelo por ID
function buscarModelo(id) {
    return modelos.find(m => m.id === parseInt(id));
}

// Função para listar modelos disponíveis
function listarModelos() {
    if (modelos.length === 0) return 'Nenhum modelo cadastrado.';
    return modelos.map(m => `${m.id}. **${m.nome}**\n   ${m.descricao}`).join('\n\n');
}

// Função para resetar o estado do usuário
function resetUserState(chatId) {
    userStates[chatId] = {
        state: STATES.IDLE,
        promotorName: null,
        funcionario: null,
        modelText: null,
        city: null,
        date: null,
        loja: null,
        missingPlaceholders: [],
        currentPlaceholderIndex: 0,
        placeholderValues: {}
    };
}

// Função para obter data atual formatada
function getCurrentDate() {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    return `${day}/${month}/${year}`;
}

// Função para identificar placeholders não preenchidos no texto
function findMissingPlaceholders(text, data) {
    if (!text) return [];

    // Regex para encontrar {{PLACEHOLDER}} (case-insensitive)
    const regex = /\{\{([A-Z0-9_]+)\}\}/gi;
    const found = [];
    let match;

    while ((match = regex.exec(text)) !== null) {
        found.push(match[1]); // Mantém original (pode ser "Nome" ou "NOME")
    }

    // Filtrar apenas os que ainda não têm valor no data
    const missing = found.filter(originalPlaceholder => {
        const placeholder = originalPlaceholder.toUpperCase(); // Normaliza para comparar

        // Ignorar placeholders automáticos ou já preenchidos
        if (placeholder === 'PROMOTOR' && data.promotorName) return false;
        if (placeholder === 'DATA') return false; // Sempre preenchido
        if (placeholder === 'LOJA' && data.loja) return false;
        if (placeholder === 'CIDADE' && (data.city || (data.funcionario && data.funcionario.cidade))) return false;

        // Se houver funcionário selecionado, ignorar TODOS os seus campos possíveis
        if (data.funcionario) {
            const funcFields = [
                'NOME', 'CARGO', 'EMPRESA', 'TELEFONE', 'EMAIL',
                'CPF', 'RG', 'MATRICULA', 'NUMERO_CARTEIRA', 'SERIE',
                'AGENCIA', 'ENDERECO'
            ];
            if (funcFields.includes(placeholder)) return false;
        }

        // Verificar se já foi preenchido manualmente (case-insensitive key check)
        if (data.placeholderValues) {
            const keys = Object.keys(data.placeholderValues).map(k => k.toUpperCase());
            if (keys.includes(placeholder)) return false;
        }

        return true;
    });

    // Remover duplicatas (case-insensitive)
    const uniqueMissing = [];
    const seen = new Set();

    missing.forEach(p => {
        const upper = p.toUpperCase();
        if (!seen.has(upper)) {
            seen.add(upper);
            uniqueMissing.push(p); // Mantém a primeira ocorrência encontrada
        }
    });

    return uniqueMissing;
}

// Função para processar placeholders no modelo
function processTemplate(template, data) {
    console.log('Processando template com dados:', JSON.stringify(data, null, 2));
    let processed = template;

    // Função auxiliar para substituir todas as ocorrências (case insensitive)
    const replaceAll = (text, key, value) => {
        if (!value) return text;
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'gi');
        return text.replace(regex, value);
    };

    // Substituir placeholders principais
    processed = replaceAll(processed, 'PROMOTOR', data.promotorName);
    processed = replaceAll(processed, 'DATA', data.date || getCurrentDate());
    processed = replaceAll(processed, 'LOJA', data.loja);
    processed = replaceAll(processed, 'CIDADE', data.city);

    // Substituir dados do funcionário (remetente)
    if (data.funcionario) {
        processed = replaceAll(processed, 'NOME', data.funcionario.nome);
        processed = replaceAll(processed, 'CARGO', data.funcionario.cargo);
        processed = replaceAll(processed, 'EMPRESA', data.funcionario.empresa);
        processed = replaceAll(processed, 'TELEFONE', data.funcionario.telefone);
        processed = replaceAll(processed, 'EMAIL', data.funcionario.email);

        // Campos adicionais
        processed = replaceAll(processed, 'CPF', data.funcionario.cpf);
        processed = replaceAll(processed, 'RG', data.funcionario.rg);
        processed = replaceAll(processed, 'MATRICULA', data.funcionario.matricula);
        processed = replaceAll(processed, 'NUMERO_CARTEIRA', data.funcionario.numero_carteira);
        processed = replaceAll(processed, 'SERIE', data.funcionario.serie);
        processed = replaceAll(processed, 'AGENCIA', data.funcionario.empresa);

        // Fallback para cidade do funcionário se não especificada
        if (!data.city && data.funcionario.cidade) {
            processed = replaceAll(processed, 'CIDADE', data.funcionario.cidade);
        }
    }

    // Substituir placeholders genéricos capturados
    if (data.placeholderValues) {
        Object.keys(data.placeholderValues).forEach(key => {
            processed = replaceAll(processed, key, data.placeholderValues[key]);
        });
    }

    // Lógica inteligente para destinatário (Removida conforme solicitação do usuário para deixar em branco)
    // Se o modelo não tem {{PROMOTOR}}, não injetar nada automaticamente.

    return processed;
}

// Comando /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    resetUserState(chatId);
    userStates[chatId].state = STATES.WAITING_REMETENTE;

    bot.sendMessage(
        chatId,
        '📄 *Gerador de Carta de Apresentação em PDF*\n\n' +
        'Digite o *nome do Promotor* para encontrar seus dados.\n\n' +
        'Ou digite "pular" para preencher manualmente depois.',
        { parse_mode: 'Markdown' }
    );
});

// Comando /funcionarios
bot.onText(/\/funcionarios/, (msg) => {
    const chatId = msg.chat.id;
    const lista = listarFuncionarios();
    bot.sendMessage(
        chatId,
        '👥 *Funcionários Cadastrados:*\n\n' + lista + '\n\n' +
        'Use /start e digite o nome de um funcionário para usar seus dados automaticamente!',
        { parse_mode: 'Markdown' }
    );
});

// Comando /modelos
bot.onText(/\/modelos/, (msg) => {
    const chatId = msg.chat.id;
    const lista = listarModelos();
    bot.sendMessage(
        chatId,
        '📝 *Modelos Disponíveis:*\n\n' + lista + '\n\n' +
        'Use /start e escolha um modelo quando solicitado!',
        { parse_mode: 'Markdown' }
    );
});

// Comando /cancelar
bot.onText(/\/cancelar/, (msg) => {
    const chatId = msg.chat.id;
    resetUserState(chatId);
    bot.sendMessage(chatId, '❌ Operação cancelada. Use /start para começar novamente.');
});

// Comando /ajuda
bot.onText(/\/ajuda/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(
        chatId,
        '*Comandos disponíveis:*\n\n' +
        '/start - Iniciar geração de carta\n' +
        '/modelos - Ver modelos prontos\n' +
        '/funcionarios - Ver funcionários cadastrados\n' +
        '/cancelar - Cancelar operação atual\n' +
        '/ajuda - Mostrar esta mensagem\n\n' +
        '*Como usar:*\n' +
        '1️⃣ Use /start\n' +
        '2️⃣ Informe o nome do promotor\n' +
        '3️⃣ Digite o nome de um funcionário OU "pular"\n' +
        '4️⃣ Escolha um modelo pronto OU cole seu modelo\n' +
        '5️⃣ Receba o PDF!',
        { parse_mode: 'Markdown' }
    );
});

// Processar mensagens de texto
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    // Ignorar comandos
    if (text && text.startsWith('/')) return;

    // Inicializar estado se não existir
    if (!userStates[chatId]) {
        console.log(`!!! Estado recriado (zerado) para ${chatId} !!!`);
        resetUserState(chatId);
    }

    const userState = userStates[chatId];

    // Log básico para acompanhar
    console.log(`[${chatId}] Msg: "${text}" | Estado: ${userState.state}`);

    switch (userState.state) {
        case STATES.WAITING_REMETENTE:
            const inputText = text.trim();

            if (inputText.toLowerCase() === 'pular') {
                userState.state = STATES.WAITING_MODEL_CHOICE;
                const lista = listarModelos();
                bot.sendMessage(
                    chatId,
                    '⚠️ *Você pulou a seleção de funcionário.*\n' +
                    'Você terá que preencher os dados (Nome, Cargo, etc.) manualmente.\n\n' +
                    '📝 *Escolha um modelo:*\n\n' + lista + '\n\n' +
                    'Digite o *número do modelo* (1, 2, 3...) ou "personalizado".',
                    { parse_mode: 'Markdown' }
                );
            } else {
                const funcionario = buscarFuncionario(inputText);

                if (funcionario) {
                    userState.funcionario = funcionario;
                    console.log('Funcionário selecionado:', funcionario.nome);

                    userState.state = STATES.WAITING_MODEL_CHOICE;
                    const lista = listarModelos();
                    bot.sendMessage(
                        chatId,
                        `✅ *Promotor encontrado:*\n` +
                        `👤 ${funcionario.nome}\n` +
                        `💼 ${funcionario.cargo}\n\n` +
                        '📝 *Escolha um modelo:*', // Simplificado para caber na mensagem
                        { parse_mode: 'Markdown' }
                    );
                    // Separar lista para garantir entrega
                    setTimeout(() => {
                        bot.sendMessage(chatId, lista + '\n\nDigite o número do modelo (1, 2...):');
                    }, 500);
                } else {
                    bot.sendMessage(
                        chatId,
                        '❌ Funcionário não encontrado.\n\n' +
                        'Tente novamente ou digite "pular".'
                    );
                }
            }
            break;

        case STATES.WAITING_MODEL_CHOICE:
            const choice = text.trim();

            if (choice.toLowerCase() === 'personalizado') {
                userState.state = STATES.WAITING_CUSTOM_TEXT;
                bot.sendMessage(
                    chatId,
                    '✍️ Digite ou cole o texto completo da carta de apresentação:'
                );
            } else {
                const modelo = buscarModelo(choice);

                if (modelo) {
                    userState.modelText = modelo.conteudo;

                    console.log('Verificando placeholders para o estado:', JSON.stringify(userState, null, 2));

                    // Verificar se há placeholders faltantes
                    const missing = findMissingPlaceholders(userState.modelText, userState);

                    if (missing.length > 0) {
                        userState.missingPlaceholders = missing;
                        userState.currentPlaceholderIndex = 0;
                        userState.state = STATES.WAITING_PLACEHOLDERS;

                        bot.sendMessage(
                            chatId,
                            `✅ *Modelo selecionado:* ${modelo.nome}\n\n` +
                            `📝 Digite o valor para *{{${missing[0]}}}*:`,
                            { parse_mode: 'Markdown' }
                        );
                    } else {
                        bot.sendMessage(chatId, '⏳ Gerando PDF...');
                        await generateAndSendPDF(chatId, userState);
                    }
                } else {
                    bot.sendMessage(
                        chatId,
                        '❌ Modelo não encontrado.\n\n' +
                        'Digite o número do modelo (1, 2, 3...) ou "personalizado".\n\n' +
                        'Use /modelos para ver a lista.',
                        { parse_mode: 'Markdown' }
                    );
                }
            }
            break;


        case STATES.WAITING_PLACEHOLDERS:
            const currentPlaceholder = userState.missingPlaceholders[userState.currentPlaceholderIndex];

            // Salvar valor do placeholder atual
            if (!userState.placeholderValues) userState.placeholderValues = {};
            userState.placeholderValues[currentPlaceholder] = text.trim();

            // Salvar TAMBÉM nos campos específicos para garantir
            if (currentPlaceholder === 'LOJA') {
                userState.loja = text.trim();
                console.log('LOJA salva:', userState.loja);
            } else if (currentPlaceholder === 'CIDADE') {
                userState.city = text.trim();
                console.log('CIDADE salva:', userState.city);
            }

            userState.currentPlaceholderIndex++;

            if (userState.currentPlaceholderIndex < userState.missingPlaceholders.length) {
                // Ainda há mais placeholders
                const nextPlaceholder = userState.missingPlaceholders[userState.currentPlaceholderIndex];
                // Personalizar mensagem para placeholders específicos
                let pergunta = `📝 Digite o valor para *{{${nextPlaceholder}}}*:`;

                if (nextPlaceholder === 'PROMOTOR') {
                    pergunta = `📝 Digite o nome do *Responsável/Gerente da Loja*:\n(Campo {{PROMOTOR}} na carta)`;
                } else if (nextPlaceholder === 'LOJA') {
                    pergunta = `📝 Digite o nome da *Loja/Unidade*:`;
                } else if (nextPlaceholder === 'CIDADE') {
                    pergunta = `📝 Digite a *Cidade* (ex: São Paulo - SP):`;
                }

                bot.sendMessage(chatId,
                    `✅ *${currentPlaceholder}:* ${text.trim()}\n\n${pergunta}`,
                    { parse_mode: 'Markdown' }
                );
            } else {
                // Todos preenchidos
                bot.sendMessage(
                    chatId,
                    `✅ *${currentPlaceholder}:* ${text.trim()}\n\n` +
                    '⏳ Gerando PDF...'
                );
                await generateAndSendPDF(chatId, userState);
            }
            break;

        case STATES.WAITING_MODEL:
            userState.modelText = text;

            // Verificar se há placeholders não preenchidos
            const hasCity = /\{\{CIDADE\}\}/gi.test(text);

            if (hasCity) {
                userState.state = STATES.WAITING_CONFIRMATION;
                bot.sendMessage(
                    chatId,
                    '📝 Modelo recebido!\n\n' +
                    'Detectei o placeholder {{CIDADE}}. Deseja informar a cidade/UF?\n\n' +
                    'Digite a cidade ou envie "pular" para usar a data de hoje e gerar o PDF.',
                    { parse_mode: 'Markdown' }
                );
            } else {
                // Gerar PDF diretamente
                await generateAndSendPDF(chatId, userState);
            }
            break;

        case STATES.WAITING_CONFIRMATION:
            if (text.toLowerCase() !== 'pular') {
                userState.city = text.trim();
            }
            await generateAndSendPDF(chatId, userState);
            break;

        default:
            bot.sendMessage(chatId, 'Use /start para começar a gerar uma carta.');
    }
});

// Função para gerar e enviar o PDF
async function generateAndSendPDF(chatId, userState) {
    try {
        bot.sendMessage(chatId, '⏳ Gerando PDF...');

        // Processar o template
        const finalText = processTemplate(userState.modelText, {
            promotorName: userState.promotorName,
            funcionario: userState.funcionario,
            city: userState.city,
            loja: userState.loja,
            date: getCurrentDate(),
            placeholderValues: userState.placeholderValues
        });

        // Gerar PDF
        const pdfBuffer = await generatePDF(finalText);

        // Gerar nome do arquivo personalizado com promotor (funcionário), loja e data
        // Priorizar nome do funcionário se existir, senão promotorName (remanescente), senão 'promotor'
        const rawPromotor = userState.funcionario ? userState.funcionario.nome : (userState.promotorName || 'promotor');
        const rawLoja = userState.loja || 'loja';

        const promotorSlug = rawPromotor.toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove acentos
            .replace(/[^a-z0-9]+/g, '_') // Substitui caracteres especiais por _
            .replace(/^_+|_+$/g, '') // Remove underlines extras no início/fim
            .substring(0, 60); // Aumentado limite para nomes completos

        const lojaSlug = rawLoja.toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '')
            .substring(0, 30);

        const dataSlug = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');

        const filename = `carta_${promotorSlug}_${userState.modelText ? '' : lojaSlug}_${dataSlug}.pdf`.replace(/__+/g, '_');
        // Simplificado: carta_nome_loja_data.pdf

        console.log('Arquivo gerado:', filename);

        // Salvar em disco temporariamente para garantir o nome do arquivo
        const filePath = path.join(__dirname, filename);
        fs.writeFileSync(filePath, pdfBuffer);

        // Enviar PDF lendo do disco
        await bot.sendDocument(chatId, filePath, {
            caption: '✅ *Carta gerada com sucesso!*\\n\\nSe quiser gerar outra carta, use /start',
            parse_mode: 'Markdown'
        });

        // Deletar arquivo temporário
        fs.unlinkSync(filePath);

        // Resetar estado
        resetUserState(chatId);

    } catch (error) {
        console.error('Erro ao gerar PDF:', error);
        bot.sendMessage(
            chatId,
            '❌ Erro ao gerar o PDF. Tente novamente com /start'
        );
        resetUserState(chatId);
    }
}

// Tratamento de erros
bot.on('polling_error', (error) => {
    console.error('Polling error:', error);
});

console.log('🤖 Bot iniciado com sucesso!');
