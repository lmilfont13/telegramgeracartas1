# Usar uma imagem base leve do Node.js
FROM node:18-slim

# Criar diretório do app
WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências (incluindo as de PDF e Bot)
RUN npm install --production

# Copiar o restante do código necessário para o worker
COPY saas-worker.js ./
COPY saas-pdf-generator.js ./
COPY utils/ ./utils/

# Variáveis de ambiente serão passadas pelo Render/Railway
# Mas definimos um valor padrão se necessário
ENV NODE_ENV=production

# Comando para rodar o worker
CMD ["node", "saas-worker.js"]
