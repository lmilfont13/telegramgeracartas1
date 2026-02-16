# 🌐 Deploy Rápido do Bot

Para deixar seu Bot online 24h, siga estes passos simples. Não precisa pagar nada!

## Opção 1: Railway (Mais Fácil)

1. **Abra este site:** [railway.app](https://railway.app)
2. Clique em **Login** e entre com sua conta **GitHub**.
3. Clique em **+ New Project** -> **Deploy from GitHub repo**.
4. Selecione o repositório deste bot (`telegram-bot` ou similar).
5. Clique em **Add Variables** e adicione:
   - Nome: `TELEGRAM_BOT_TOKEN`
   - Valor: `(Cole o token do seu bot aqui)`
6. Pronto! O bot vai iniciar sozinho.

## Opção 2: Render (Alternativa)

1. **Abra este site:** [render.com](https://render.com)
2. Crie uma conta.
3. Clique em **New +** -> **Web Service**.
4. Conecte seu GitHub e escolha o repositório do bot.
5. Em **Environment Variables**, adicione:
   - Key: `TELEGRAM_BOT_TOKEN`
   - Value: `(Cole o token do seu bot aqui)`
6. Clique em **Create Web Service**.

---

**Dica:** Toda vez que eu atualizar o código aqui no seu PC, eu vou mandar para o GitHub automaticamente. O Railway/Render vai ver a mudança e atualizar o bot sozinho! 🚀
