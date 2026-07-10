# 🏛️ Guia de Deploy em VPS — Sistema ILC via Easypanel

Este guia descreve as etapas necessárias para subir o sistema **Índice de Lealdade Cívica (ILC)** em um servidor VPS utilizando o **Easypanel** e conectando ao banco de dados relacional **Supabase**.

---

## 💾 1. Configurando o Banco de Dados (Supabase)

O portal utiliza o banco de dados do **Supabase** (PostgreSQL) para gerenciar cidadãos, eventos, certificados e logs.

1. Acesse o console do [Supabase](https://supabase.com/) e crie um **Novo Projeto**.
2. Guarde a senha mestre do banco de dados definida no cadastro.
3. Quando o projeto estiver pronto, acesse o painel **SQL Editor** na barra lateral esquerda.
4. Clique em **New Query**, cole todo o conteúdo do arquivo [setup_schema.sql](file:///d:/Desktop/htmls%20projetos/Antigravity/ILC/SQL/setup_schema.sql) e clique no botão **Run** (Executar).
   - *Este comando irá estruturar todas as tabelas, permissões RBAC, enums de status, faixas de lealdade (Tiers) e as conquistas digitais.*
5. Vá para **Project Settings** (Engrenagem) > **Database** e localize a seção **Connection string**.
6. Copie a URI sob a aba **URI** (Modo Direct Connection). A string se parecerá com esta:
   ```text
   postgresql://postgres:[SUA-SENHA]@db.[ID-DO-PROJETO].supabase.co:5432/postgres
   ```
   *Substitua `[SUA-SENHA]` pela senha que você definiu ao criar o projeto.*

---

## 🐧 2. Instalando o Easypanel na VPS

O Easypanel é um painel de controle leve e poderoso baseado em Docker, ideal para rodar stacks full-stack em VPS.

1. Contrate uma máquina virtual (VPS) com **Ubuntu (20.04/22.04 LTS)** e no mínimo 1 vCPU e 1 GB de RAM.
2. Acesse a máquina via terminal SSH:
   ```bash
   ssh root@<IP_DA_SUA_VPS>
   ```
3. Execute o comando oficial de instalação do Easypanel:
   ```bash
   curl -sSL https://easypanel.io/install.sh | bash
   ```
4. Ao final da instalação, acesse o painel pelo navegador usando o IP exposto no terminal (porta padrão `3000`):
   ```text
   http://<IP_DA_SUA_VPS>:3000
   ```
5. Crie a conta do administrador do painel no primeiro acesso.

---

## 🐳 3. Deploiando o Portal no Easypanel

Com o painel pronto e o banco Supabase configurado, vamos subir a aplicação:

1. No Easypanel, clique no botão **Create Project** e dê um nome (ex: `ilc-dashboard`).
2. Dentro do projeto, clique em **Add Service** e escolha **App**.
3. Configure a **Origem do Código (Source)**:
   - Se seu repositório estiver no **GitHub**: conecte sua conta do GitHub, selecione o repositório do ILC, a branch correspondente (ex: `main`) e defina o diretório base como `/`.
   - Se for usar **Git genérico**: insira a URL do repositório Git público ou privado (com chave SSH).
4. Configure o **Método de Build**:
   - O Easypanel detectará automaticamente o arquivo `Dockerfile` na raiz do projeto. Caso contrário, selecione **Dockerfile** no menu de configurações do App.
5. Adicione as **Variáveis de Ambiente (Environment)**:
   Acesse a aba **Environment** do serviço no Easypanel e cadastre as seguintes chaves/valores:
   
   | Chave | Valor Exemplo | Descrição |
   |---|---|---|
   | `DATABASE_URL` | `postgresql://postgres:senha@db.supabase.co:5432/postgres` | A Connection String copiada do Supabase. |
   | `JWT_SECRET` | `uma-chave-longa-e-muito-segura-estatal` | Chave secreta usada para assinar as credenciais JWT. |
   | `PORT` | `3000` | Porta onde o container Express escutará as requisições. |
   | `NODE_ENV` | `production` | Define o ambiente em modo de produção. |

6. Mapeamento de Domínio:
   - Sob a aba **Domains**, o Easypanel gera um subdomínio automático gratuito do tipo `.easypanel.host` (ex: `ilc.vps-slug.easypanel.host`).
   - Se desejar usar um domínio próprio (ex: `ilc.meusite.com`), adicione-o nesta seção e aponte um registro do tipo `A` no seu DNS (Cloudflare, GoDaddy, etc.) apontando para o IP da sua VPS.
7. Clique em **Deploy**. O Easypanel irá baixar o código, executar os comandos do `Dockerfile` multi-estágio, expor a porta e rodar a aplicação com SSL automático (Let's Encrypt).

---

## 🧪 4. Validação da Stack

1. Acesse o link gerado pelo Easypanel no seu navegador.
2. A tela de **Login do Cidadão** deverá carregar com a paleta retrofuturista.
3. Se for o primeiro acesso a um banco limpo, o servidor Express irá detectar e semear automaticamente as contas administrativas e cidadãos de teste.
4. Faça o login de teste rápido usando os botões do simulador no topo da tela ou digitando:
   - **Identificador**: `comissario_otavio`
   - **Senha**: `admin123`
5. Teste o lançamento de um evento de doação de sangue no painel administrativo e confira se a alteração de score e auditoria são refletidas em tempo real.
