# Como Adicionar a Logo ao PDF

## Passo 1: Salvar a Logo

1. Salve a imagem da logo da empresa como `logo.png` ou `logo.jpg`
2. Coloque o arquivo na pasta `telegram-bot` (mesma pasta do bot.js)

## Passo 2: Formato Recomendado

- **Formato**: PNG (com fundo transparente) ou JPG
- **Tamanho recomendado**: 400x200 pixels ou similar
- **Nome do arquivo**: `logo.png` ou `logo.jpg`

## Como Funciona

O bot agora verifica automaticamente se existe um arquivo `logo.png` ou `logo.jpg` na pasta do projeto. Se encontrar, adiciona a logo no topo do PDF (canto superior esquerdo) com largura de 120 pontos (~4cm).

## Ajustar Tamanho da Logo

Se quiser ajustar o tamanho da logo, edite o arquivo `pdfGenerator.js` na linha que contém:

```javascript
doc.image(logoPath, 72, 40, { width: 120 });
```

- **width: 120** = largura em pontos (aumente ou diminua conforme necessário)
- **72, 40** = posição X e Y (margem esquerda e topo)

## Exemplo

Se sua logo estiver muito pequena, mude para:
```javascript
doc.image(logoPath, 72, 40, { width: 150 });
```

Se estiver muito grande:
```javascript
doc.image(logoPath, 72, 40, { width: 100 });
```
