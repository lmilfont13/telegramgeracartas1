# 📄 Bot Telegram - Gerador de Cartas de Apresentação em PDF 🤖

Bot do Telegram que gera cartas de apresentação profissionais em PDF através de um fluxo conversacional simples.

## 🚀 Funcionalidades

- ✅ Fluxo conversacional intuitivo
- ✅ Suporte a placeholders ({{PROMOTOR}}, {{DATA}}, {{CIDADE}})
- ✅ Inserção automática do nome do promotor em saudações
- ✅ Geração de PDF profissional com formatação
- ✅ Suporte a negrito, títulos e listas
- ✅ Data automática (formato brasileiro: dd/mm/aaaa)

## 📋 Pré-requisitos

- Node.js 18+ instalado
- Token do bot do Telegram (obtenha com [@BotFather](https://t.me/BotFather))

## 🔧 Instalação Local

1. **Clone ou baixe o projeto**

2. **Instale as dependências:**
```bash
npm install
```

3. **Configure as variáveis de ambiente:**
```bash
# Copie o arquivo de exemplo
cp .env.example .env

# Edite o .env e adicione seu token
TELEGRAM_BOT_TOKEN=seu_token_aqui
```

4. **Execute o bot:**
```bash
# Modo desenvolvimento (com auto-reload)
npm run dev

# Modo produção
npm start
```

## 🌐 Deploy Gratuito

### Opção 1: Railway.app (Recomendado)

1. Crie uma conta em [railway.app](https://railway.app)
2. Clique em "New Project" → "Deploy from GitHub repo"
3. Conecte seu repositório
4. Adicione a variável de ambiente:
   - `TELEGRAM_BOT_TOKEN` = seu token
5. Deploy automático! ✅

**Vantagens:**
- 500 horas/mês grátis
- Deploy automático via Git
- Logs em tempo real
- Muito fácil de usar

### Opção 2: Render.com

1. Crie uma conta em [render.com](https://render.com)
2. Clique em "New +" → "Web Service"
3. Conecte seu repositório GitHub
4. Configure:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
5. Adicione variável de ambiente:
   - `TELEGRAM_BOT_TOKEN` = seu token
6. Clique em "Create Web Service"

**Vantagens:**
- 750 horas/mês grátis
- SSL automático
- Boa documentação

### Opção 3: Glitch.com

1. Acesse [glitch.com](https://glitch.com)
2. Clique em "New Project" → "Import from GitHub"
3. Cole a URL do seu repositório
4. Edite o arquivo `.env` e adicione seu token
5. O bot inicia automaticamente!

**Vantagens:**
- Muito simples
- Editor online
- Sempre online

## 📱 Como Usar o Bot

1. **Inicie a conversa:**
   - Envie `/start` para o bot

2. **Informe o nome do promotor:**
   - Digite o nome completo

3. **Cole o modelo da carta:**
   - Pode usar placeholders: `{{PROMOTOR}}`, `{{DATA}}`, `{{CIDADE}}`
   - Se não usar placeholders, o bot insere automaticamente

4. **Receba o PDF:**
   - O bot gera e envia o PDF pronto!

## 🎯 Comandos Disponíveis

- `/start` - Iniciar geração de carta
- `/cancelar` - Cancelar operação atual
- `/ajuda` - Mostrar ajuda

## 📝 Exemplo de Modelo

```
Prezado(a) {{PROMOTOR}},

Venho por meio desta apresentar nossa proposta de parceria...

**Benefícios:**
- Aumento de produtividade
- Redução de custos
- Suporte especializado

Atenciosamente,
Empresa XYZ

{{CIDADE}}, {{DATA}}
```

## 🔒 Segurança

- ✅ Token armazenado em variável de ambiente
- ✅ `.gitignore` configurado para proteger dados sensíveis
- ✅ Sem armazenamento de dados do usuário

## 🛠️ Tecnologias

- **Node.js** - Runtime JavaScript
- **node-telegram-bot-api** - API do Telegram
- **PDFKit** - Geração de PDF
- **dotenv** - Gerenciamento de variáveis de ambiente

## 📞 Suporte

Se tiver problemas:
1. Verifique se o token está correto
2. Confira os logs do servidor
3. Teste localmente primeiro com `npm run dev`

## 📄 Licença

MIT
