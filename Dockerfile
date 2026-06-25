# Health Link — production image (API + static frontend on :3001)
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3001

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm install tsx@4.21.0 --no-save

COPY --from=builder /app/dist ./dist
COPY server ./server
COPY src ./src
COPY tsconfig.json ./

EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3001/api/health || exit 1

CMD ["npx", "tsx", "server/index.ts"]
