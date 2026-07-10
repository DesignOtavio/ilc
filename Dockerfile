# Multi-stage Dockerfile otimizado para deploy em VPS (produção)

# ------------------------
# Stage: builder (build do frontend)
# ------------------------
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Build-time args (non-sensitive). Use EasyPanel/GitHub build-args to set public URLs if desired.
ARG NEXT_PUBLIC_SUPABASE_URL
# Tornar disponível durante o build para que o frontend (Vite) injete a variável pública no bundle
ENV NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}

# Instalar dependências necessárias para build (inclui devDependencies)
# Aceitar peer deps legacy quando necessário
ENV NPM_CONFIG_LEGACY_PEER_DEPS=1
COPY package.json package-lock.json* ./
# Use npm ci when package-lock.json exists for reproducible build, fallback to npm install
RUN if [ -f package-lock.json ]; then npm ci --legacy-peer-deps; else npm install --legacy-peer-deps; fi

# Copiar todo o código e gerar build do frontend (Vite)
COPY . .
RUN npm run build


# ------------------------
# Stage: runner (imagem final leve)
# ------------------------
FROM node:20-alpine AS runner

WORKDIR /usr/src/app

# Definir ambiente de produção
ENV NODE_ENV=production

# Instalar apenas dependências de produção
# Copiar package.json e package-lock.json se existir, para instalar de forma reprodutível
COPY package.json package-lock.json* ./
# Instalação reproducível em produção quando possível
RUN if [ -f package-lock.json ]; then npm ci --omit=dev --legacy-peer-deps; else npm install --omit=dev --legacy-peer-deps; fi

# Copiar artefatos do build e arquivos do servidor
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/server.js ./server.js
COPY --from=builder /usr/src/app/SQL ./SQL

# Criar usuário não-root e ajustar permissões
RUN addgroup -S app && adduser -S app -G app && chown -R app:app /usr/src/app
USER app

# Expor porta e definir variável padrão (pode ser sobrescrita em runtime)
ENV PORT=3000
ENV NODE_OPTIONS=--dns-result-order=ipv4first
EXPOSE 3000

# Healthcheck simples usando Node (verifica /api/health)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD node -e "require('http').get('http://localhost:'+ (process.env.PORT||3000) +'/api/health', res=>{if(res.statusCode===200) process.exit(0); else process.exit(1)}).on('error',()=>process.exit(1))"

# Iniciar o servidor Express
CMD ["node", "server.js"]
