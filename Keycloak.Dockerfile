# Railway için optimize edilmiş Keycloak Dockerfile
FROM quay.io/keycloak/keycloak:24.0

# Gerekli hazırlıklar
USER root
WORKDIR /opt/keycloak

# Realm yapılandırma dosyasını kopyala
# Bu dosya, Keycloak başladığında otomatik olarak içe aktarılacak.
COPY keycloak-realm-config.json /opt/keycloak/data/import/

# Cache konfigürasyonu kopyala (eğer varsa)
COPY cache-ispn-local.xml /opt/keycloak/conf/

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

# Memory ayarları
ENV JAVA_OPTS="-Xms256m -Xmx768m -XX:MetaspaceSize=96M -XX:MaxMetaspaceSize=256m"

# Keycloak user'a geri dön
USER 1000

# Keycloak'ı build et (production için optimize)
RUN /opt/keycloak/bin/kc.sh build --db=postgres

# Port expose
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=90s --retries=3 \
  CMD curl -f http://localhost:8080/health/ready || exit 1

# Keycloak'ı başlat
# --import-realm flag'i sayesinde başlangıçta realm'i içe aktaracak.
ENTRYPOINT ["/opt/keycloak/bin/kc.sh"]
CMD ["start", "--import-realm", "--optimized"] 