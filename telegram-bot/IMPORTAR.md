# 📊 Importador de Funcionários

Script para importar dados de funcionários de planilhas Excel/CSV para o arquivo `funcionarios.json`.

## 🚀 Como Usar

### 1. Prepare sua planilha

Crie uma planilha Excel (.xlsx, .xls) ou CSV (.csv) com as seguintes colunas:

**Colunas Obrigatórias:**
- `Nome` - Nome completo do funcionário
- `Cargo` - Cargo/função
- `Empresa` - Nome da empresa
- `Telefone` - Telefone de contato
- `Email` - Email
- `Cidade` - Cidade/UF

**Colunas Opcionais:**
- `RG` - Número do RG
- `CPF` - Número do CPF
- `Matricula` - Matrícula do funcionário
- `Numero_Carteira` - Número da CTPS
- `Serie` - Série da CTPS

> **Nota:** A ordem das colunas não importa. O script detecta automaticamente.

### 2. Instale a dependência

```bash
npm install
```

### 3. Execute o importador

```bash
node importar-funcionarios.js caminho/para/sua-planilha.xlsx
```

**Exemplos:**
```bash
# Importar de Excel
node importar-funcionarios.js funcionarios.xlsx

# Importar de CSV
node importar-funcionarios.js exemplo-funcionarios.csv

# Importar de outra pasta
node importar-funcionarios.js C:\Downloads\lista-funcionarios.xlsx
```

### 4. Reinicie o bot

Após a importação, reinicie o bot para carregar os novos dados:

```bash
# Parar o bot (Ctrl+C)
# Iniciar novamente
npm start
```

## 📋 Exemplo de Planilha

Veja o arquivo [exemplo-funcionarios.csv](file:///c:/Users/Luciano/.gemini/antigravity/playground/entropic-solstice/telegram-bot/exemplo-funcionarios.csv) para referência.

| Nome | Cargo | Empresa | Telefone | Email | Cidade | RG | CPF | Matricula |
|------|-------|---------|----------|-------|--------|----|----|-----------|
| João Silva | Diretor | Empresa XYZ | (11) 99999-9999 | joao@empresa.com | São Paulo, SP | 12.345.678-9 | 123.456.789-00 | 001234 |

## ✅ O que o script faz

1. ✅ Lê a planilha Excel/CSV
2. ✅ Detecta automaticamente as colunas
3. ✅ Normaliza os dados (remove espaços, converte formatos)
4. ✅ Cria/substitui o arquivo `funcionarios.json`
5. ✅ Mostra preview dos funcionários importados

## 🔍 Saída do Script

```
📊 Lendo planilha: funcionarios.xlsx
✅ 50 linhas encontradas

✅ Importação concluída!
📁 Arquivo salvo: C:\...\funcionarios.json
👥 Total de funcionários: 50

📋 Preview dos primeiros funcionários:

1. João Silva
   Cargo: Diretor Comercial
   Empresa: Tecnologia & Inovação Ltda.
   CPF: 123.456.789-00
   RG: 12.345.678-9

... e mais 47 funcionários.

🔄 Reinicie o bot para carregar os novos dados!
```

## ⚠️ Observações

- O script **substitui** o arquivo `funcionarios.json` existente
- Faça backup antes de importar se necessário
- Colunas com nomes diferentes são detectadas automaticamente (ex: "Name" → "Nome", "Phone" → "Telefone")
- Campos vazios são ignorados

## 🛠️ Troubleshooting

**Erro: "Arquivo não encontrado"**
- Verifique o caminho do arquivo
- Use caminho absoluto ou relativo correto

**Erro: "Cannot find module 'xlsx'"**
- Execute `npm install` primeiro

**Dados não aparecem no bot**
- Reinicie o bot após importar
- Verifique se `funcionarios.json` foi criado corretamente
