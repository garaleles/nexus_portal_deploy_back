# Railway için optimize edilmiş Dockerfile
FROM node:20-alpine

# Sistem güncellemeleri ve gerekli paketler
RUN apk add --no-cache dumb-init curl

# Çalışma dizini
WORKDIR /app

# Kullanıcı oluştur
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Package dosyalarını kopyala
COPY --chown=nestjs:nodejs package*.json ./

# Bağımlılıkları yükle
RUN npm install --legacy-peer-deps && npm cache clean --force

# Kaynak kodunu kopyala
COPY --chown=nestjs:nodejs . .

# Uygulamayı build et
RUN npm run build

# Kullanıcı izinlerini düzelt
RUN chown -R nestjs:nodejs /app

# Non-root kullanıcıya geç
USER nestjs

# Port
EXPOSE 3000

# Health check ekle
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Uygulama başlat
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "run", "start:prod"] 