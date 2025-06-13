# Builder aşaması
FROM node:18-alpine as builder

WORKDIR /app

COPY package*.json ./

# Tüm bağımlılıkları kur (devDependencies dahil)
RUN npm ci --legacy-peer-deps && npm cache clean --force

COPY . .

RUN npm run build

# Production aşaması
FROM node:18-alpine as production

RUN apk add --no-cache dumb-init

RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

WORKDIR /app

COPY package*.json ./

# Sadece production bağımlılıkları kur
RUN npm ci --only=production --legacy-peer-deps && npm cache clean --force

COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist

USER nestjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node dist/health-check.js || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]