# Railway için optimize edilmiş Keycloak Dockerfile
FROM quay.io/keycloak/keycloak:24.0

# Gerekli hazırlıklar
USER root
WORKDIR /opt/keycloak

# PostgreSQL client yükle (pg_isready için)
RUN microdnf install -y postgresql && microdnf clean all

# Realm yapılandırma dosyasını kopyala
# Bu dosya, Keycloak başladığında otomatik olarak içe aktarılacak.
COPY keycloak-realm-config.json /opt/keycloak/data/import/

# Cache konfigürasyonu kopyala (eğer varsa)
COPY cache-ispn-local.xml /opt/keycloak/conf/

# Startup script'i kopyala
COPY keycloak-startup.sh /opt/keycloak/bin/
RUN chmod +x /opt/keycloak/bin/keycloak-startup.sh

# Railway için ortam değişkenleri
# Bu değişkenler Railway servis ayarlarında tanımlanmalıdır.
# Örnek: KC_HOSTNAME=my-keycloak-service.up.railway.app
ENV KC_PROXY=edge
ENV KC_DB=postgres
ENV KC_HEALTH_ENABLED=true
ENV KC_METRICS_ENABLED=true
ENV KC_HTTP_ENABLED=true
ENV KC_HOSTNAME_STRICT=false
ENV KC_HOSTNAME_STRICT_HTTPS=false
ENV KC_HOSTNAME_STRICT_BACKCHANNEL=false
ENV KC_HTTPS_REQUIRED=none
ENV KC_SPI_TRUSTSTORE_FILE_DISABLED=true
ENV KC_SPI_CONNECTIONS_HTTP_CLIENT_DEFAULT_DISABLE_TRUST_MANAGER=true
ENV KC_SPI_HOSTNAME_DEFAULT_FRONTEND_URL=https://business-portal-keycloak-production.up.railway.app
ENV KC_SPI_HOSTNAME_DEFAULT_ADMIN_URL=https://business-portal-keycloak-production.up.railway.app

# Memory ayarları
ENV JAVA_OPTS="-Xms256m -Xmx768m -XX:MetaspaceSize=96M -XX:MaxMetaspaceSize=256m"

# Keycloak user'a geri dön
USER 1000

# Keycloak'ı build et (production için optimize)
RUN /opt/keycloak/bin/kc.sh build --db=postgres

# Port expose
EXPOSE 8080

# Health check - daha uzun startup time
HEALTHCHECK --interval=30s --timeout=15s --start-period=120s --retries=5 \
  CMD curl -f http://localhost:8080/health/ready || exit 1

# Startup script'i çalıştır
ENTRYPOINT ["/opt/keycloak/bin/keycloak-startup.sh"] 