# ==========================================
# DOCKERFILE PARA DEPLOY ESTATAL (EASYPANEL)
# ==========================================

# Estágio 1: Build do frontend (Vite/React)
FROM node:18-alpine AS builder

WORKDIR /usr/src/app

# Copiar manifesto de dependências
COPY package.json ./

# Instalar TODAS as dependências (incluindo devDependencies para o build do Vite)
RUN npm install

# Copiar todo o código fonte
COPY . .

# Gerar o build de produção do React (saída em /dist)
RUN npm run build

# ==========================================
# Estágio 2: Runner final leve
# ==========================================
FROM node:18-alpine AS runner

WORKDIR /usr/src/app

# Copiar apenas o package.json para instalar dependências de produção
COPY package.json ./
RUN npm install --omit=dev

# Copiar o servidor Express
COPY server.js ./

# Copiar os SQL seeds (usados em runtime para init do banco)
COPY SQL/ ./SQL/

# Copiar o build do React gerado no estágio anterior
COPY --from=builder /usr/src/app/dist ./dist

# Definir variáveis padrão de produção
ENV NODE_ENV=production
ENV PORT=3000

# Porta exposta do container
EXPOSE 3000

# Comando para iniciar o servidor Express (que serve o dist/ estático)
CMD ["node", "server.js"]
