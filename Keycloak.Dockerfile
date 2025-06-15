# Railway için optimize edilmiş Keycloak Dockerfile
FROM quay.io/keycloak/keycloak:23.0

# Gerekli paketler
USER root
RUN microdnf install -y curl && microdnf clean all

# Railway için environment variables
ENV KC_HTTP_ENABLED=true
ENV KC_HOSTNAME_STRICT=false  
ENV KC_HOSTNAME_STRICT_HTTPS=false
ENV KC_PROXY=edge
ENV KC_DB=postgres
ENV KC_HEALTH_ENABLED=true
ENV KC_METRICS_ENABLED=true

# Keycloak user'a geri dön
USER 1000

# Working directory
WORKDIR /opt/keycloak

# Keycloak'ı build et (production için optimize)
RUN /opt/keycloak/bin/kc.sh build

# Port expose
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=5 \
    CMD curl -f http://localhost:8080/health/ready || exit 1

# Keycloak'ı başlat
ENTRYPOINT ["/opt/keycloak/bin/kc.sh"]
CMD ["start", "--http-enabled=true", "--proxy=edge", "--hostname-strict=false"] 