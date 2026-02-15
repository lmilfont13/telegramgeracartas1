# Como Adicionar Carimbos/Assinaturas ao PDF

## Arquivos Necessários

Para que os carimbos apareçam automaticamente no final de cada carta, você precisa salvar as imagens na pasta do projeto:

1. **carimbo1.png** - Carimbo do CNPJ da Pop Trade Marketing
2. **carimbo2.png** - Assinatura do responsável

## Passos

1. Salve a primeira imagem (carimbo CNPJ) como `carimbo1.png`
2. Salve a segunda imagem (assinatura) como `carimbo2.png`
3. Coloque ambos os arquivos na pasta `telegram-bot`

## Como Funciona

O bot agora adiciona automaticamente os carimbos no final de cada PDF gerado:
- Se encontrar `carimbo1.png`, adiciona no final
- Se encontrar `carimbo2.png`, adiciona logo abaixo
- Se não encontrar os arquivos, gera o PDF normalmente sem os carimbos

## Ajustar Tamanho

Se quiser ajustar o tamanho dos carimbos, edite o arquivo `pdfGenerator.js` nas linhas que contêm:

```javascript
fit: [200, 100]
```

- Primeiro número = largura máxima
- Segundo número = altura máxima

Exemplo para carimbos maiores:
```javascript
fit: [250, 125]
```
