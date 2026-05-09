FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

# Versão do Bot: 1.2.0
RUN npm install --no-package-lock

COPY . .

CMD ["npm", "start"]
