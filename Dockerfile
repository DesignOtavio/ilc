# Multi-stage Dockerfile otimizado para deploy em VPS (produção)

# ------------------------
# Stage: builder (build do frontend)
# ------------------------
FROM node:18-alpine AS builder

WORKDIR /usr/src/app

# Instalar dependências necessárias para build (inclui devDependencies)
COPY package.json package-lock.json* ./
RUN npm install

# Copiar todo o código e gerar build do frontend (Vite)
COPY . .
RUN npm run build


# ------------------------
# Stage: runner (imagem final leve)
# ------------------------
FROM node:18-alpine AS runner

WORKDIR /usr/src/app

# Definir ambiente de produção
ENV NODE_ENV=production

# Instalar apenas dependências de produção
# Copiar somente package.json para evitar que package-lock com devDeps cause conflitos
COPY package.json ./
# Use --legacy-peer-deps para evitar falhas por peer-dependency durante install em build de imagem
RUN npm install --omit=dev --legacy-peer-deps

# Copiar artefatos do build e arquivos do servidor
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/server.js ./server.js
COPY --from=builder /usr/src/app/SQL ./SQL

# Criar usuário não-root e ajustar permissões
RUN addgroup -S app && adduser -S app -G app && chown -R app:app /usr/src/app
USER app

# Expor porta e definir variável padrão (pode ser sobrescrita em runtime)
ENV PORT=3000
EXPOSE 3000

# Healthcheck simples usando Node (verifica /api/health)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD node -e "require('http').get('http://localhost:'+ (process.env.PORT||3000) +'/api/health', res=>{if(res.statusCode===200) process.exit(0); else process.exit(1)}).on('error',()=>process.exit(1))"

# Iniciar o servidor Express
CMD ["node", "server.js"]
