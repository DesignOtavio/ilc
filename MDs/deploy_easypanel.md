# 🏛️ Guia de Deploy — Login do Cidadão (ILC) no Easypanel (VPS)

> Guia completo para subir o sistema ILC em uma VPS utilizando o **Easypanel** como painel de gerenciamento de containers Docker.

---

## Pré-requisitos

| Item | Requisito mínimo |
|------|-----------------|
| VPS | 2 vCPU / 2 GB RAM (Ubuntu 22.04 LTS recomendado) |
| Domínio | Um domínio ou subdomínio apontando para o IP da VPS |
| Easypanel | Instalado e acessível via browser |
| Conta Supabase | Projeto criado com as tabelas do `SQL/setup_schema.sql` |
| Conta Google Cloud | Credenciais OAuth 2.0 configuradas (para login com Google) |

---

## Passo 1 — Preparar o Banco de Dados no Supabase

1. Acesse [supabase.com](https://supabase.com) e entre no seu projeto.
2. Vá em **SQL Editor** → **New Query**.
3. Cole o conteúdo completo do arquivo `SQL/setup_schema.sql` deste repositório.
4. Clique em **Run** para criar todas as tabelas, enums e registros iniciais.
5. Vá em **Project Settings → Database** e copie a **Connection String (URI)**.
   - Formato: `postgresql://postgres:[SENHA]@db.[ID].supabase.co:5432/postgres`

---

## Passo 2 — Configurar as Credenciais OAuth do Google

1. Acesse o [Google Cloud Console](https://console.cloud.google.com).
2. Crie um novo projeto (ou use um existente).
3. Vá em **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client IDs**.
4. Tipo de aplicação: **Web application**.
5. Em **Authorized JavaScript origins**, adicione:
   - `https://SEU_DOMINIO.com`
6. Em **Authorized redirect URIs**, adicione:
   - `https://SEU_DOMINIO.com/api/auth/google/callback`
7. Salve e copie o **Client ID** e o **Client Secret**.

---

## Passo 3 — Instalar o Easypanel na VPS

Conecte-se via SSH na sua VPS e execute:

```bash
curl -sSL https://easypanel.io/install.sh | sh
```

Aguarde a instalação. O Easypanel estará disponível em `http://SEU_IP:3000`.

> **Nota**: Após configurar o domínio no Easypanel, o acesso ao painel migrará para `https://SEU_DOMINIO`.

---

## Passo 4 — Criar o Projeto no Easypanel

1. Acesse o painel do Easypanel no browser.
2. Clique em **Create Project** e nomeie como `ilc` (ou como preferir).

---

## Passo 5 — Adicionar o Serviço da Aplicação

### Opção A: Deploy via GitHub (Recomendado)

1. Dentro do projeto `ilc`, clique em **Create Service → App**.
2. Selecione **GitHub** como fonte.
3. Conecte sua conta GitHub e selecione o repositório do ILC.
4. Configure:
   - **Branch**: `main`
   - **Build Command**: *(deixe em branco, o Dockerfile cuida disso)*
   - **Start Command**: *(deixe em branco)*
5. Certifique-se de que o **Dockerfile** está na raiz do repositório.

### Opção B: Deploy via Docker Image

Se preferir fazer o build localmente e enviar para o Docker Hub:

```bash
# Na sua máquina local, dentro da pasta do projeto:
docker build -t SEU_USUARIO_DOCKERHUB/ilc-portal:latest .
docker push SEU_USUARIO_DOCKERHUB/ilc-portal:latest
```

No Easypanel, crie o serviço com **Docker Image** e use `SEU_USUARIO_DOCKERHUB/ilc-portal:latest`.

---

## Passo 6 — Configurar as Variáveis de Ambiente no Easypanel

Dentro do serviço criado, vá em **Environment Variables** e adicione:

| Variável | Valor | Onde encontrar |
|----------|-------|----------------|
| `DATABASE_URL` | `postgresql://postgres:SENHA@db.ID.supabase.co:5432/postgres` | Supabase → Project Settings → Database |
| `JWT_SECRET` | string aleatória longa (64+ chars) | [Gerar aqui](https://generate-secret.vercel.app/64) |
| `SESSION_SECRET` | string aleatória diferente do JWT_SECRET (32+ chars) | [Gerar aqui](https://generate-secret.vercel.app/32) |
| `GOOGLE_CLIENT_ID` | `XXX.apps.googleusercontent.com` | Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | `GOCSPX-...` | Google Cloud Console |
| `GOOGLE_CALLBACK_URL` | `https://SEU_DOMINIO.com/api/auth/google/callback` | Seu domínio |
| `NODE_ENV` | `production` | — |
| `PORT` | `3000` | — |

---

## Passo 7 — Configurar o Domínio e HTTPS

1. No serviço do Easypanel, vá em **Domains**.
2. Clique em **Add Domain** e insira seu domínio (ex: `ilc.seudominio.com`).
3. O Easypanel provisionará automaticamente um certificado **Let's Encrypt** (HTTPS).
4. Configure o DNS do seu domínio para apontar para o IP da VPS:
   - Tipo `A` → `SEU_IP_DA_VPS`

---

## Passo 8 — Deploy e Verificação

1. Clique em **Deploy** no Easypanel.
2. Acompanhe os logs em tempo real na aba **Logs**.
3. Quando aparecer `🏛️ Conectado com sucesso ao Supabase/PostgreSQL.` e `🚀 Servidor ILC rodando na porta 3000`, o sistema está funcional.
4. Acesse `https://SEU_DOMINIO.com` no browser.

---

## Passo 9 — Credenciais de Acesso Inicial

Após o primeiro deploy, o sistema cria automaticamente os usuários administrativos iniciais (se o banco estiver vazio):

| Usuário | Nickname | Senha Padrão |
|---------|----------|-------------|
| Administrador Geral | `admin` | `admin123` |
| Operador | `operador` | `operator123` |
| Auditor | `auditor` | `auditor123` |

> **⚠️ IMPORTANTE**: Altere essas senhas imediatamente após o primeiro login!

---

## Passo 10 — Atualização da Aplicação

Para atualizar o sistema após mudanças no código:

**Via GitHub (Opção A)**:
- Faça `git push` para a branch `main`.
- O Easypanel detectará a mudança e fará o redeploy automaticamente (se o webhook estiver configurado).
- Ou clique em **Deploy** manualmente no painel.

**Via Docker Image (Opção B)**:
```bash
docker build -t SEU_USUARIO_DOCKERHUB/ilc-portal:latest .
docker push SEU_USUARIO_DOCKERHUB/ilc-portal:latest
```
Depois clique em **Deploy** no Easypanel.

---

## Solução de Problemas Comuns

### ❌ "DATABASE_URL não configurada"
- Verifique se a variável `DATABASE_URL` está corretamente definida nas variáveis de ambiente do Easypanel.
- Confirme que a Connection String do Supabase está no formato correto.

### ❌ "Erro de conexão com o banco de dados"
- Certifique-se de que o IP da VPS está na allowlist do Supabase em **Project Settings → Database → Connection Pooling**.
- Tente usar a Connection String do **Connection Pooler** em vez da direta.

### ❌ Build falha no Dockerfile
- Verifique se todos os arquivos (`server.js`, `src/`, `public/`, `index.html`, `vite.config.js`) estão no repositório.
- Certifique-se de que `.env` **NÃO** está no `.gitignore` do Easypanel (as variáveis são injetadas pelo painel).

### ❌ Login com Google não funciona
- Confirme que o `GOOGLE_CALLBACK_URL` está exatamente igual à URI configurada no Google Cloud Console.
- Verifique se o domínio foi adicionado como **Authorized JavaScript origin**.

---

## Arquitetura do Sistema em Produção

```
┌─────────────────────────────────────────────────┐
│                   USUÁRIO                        │
│              (Browser / App)                     │
└──────────────────┬──────────────────────────────┘
                   │ HTTPS
┌──────────────────▼──────────────────────────────┐
│              VPS (Easypanel)                     │
│  ┌─────────────────────────────────────────┐    │
│  │  Docker Container: ilc-portal           │    │
│  │  ┌─────────────┐  ┌──────────────────┐  │    │
│  │  │  Express.js │  │  React (dist/)   │  │    │
│  │  │  :3000 API  │  │  Estáticos       │  │    │
│  │  └──────┬──────┘  └──────────────────┘  │    │
│  └─────────┼───────────────────────────────┘    │
│            │ SSL (Let's Encrypt via Easypanel)   │
└────────────┼────────────────────────────────────┘
             │
┌────────────▼────────────────────────────────────┐
│              Supabase (Cloud)                    │
│           PostgreSQL Database                    │
└─────────────────────────────────────────────────┘
```

---

*Documento gerado para o sistema Login do Cidadão — Índice de Lealdade Cívica (ILC)*
