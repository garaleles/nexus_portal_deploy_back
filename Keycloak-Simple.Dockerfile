# Railway için basit Keycloak Dockerfile
FROM quay.io/keycloak/keycloak:latest

# Root olarak curl kur
USER root
RUN microdnf install -y curl && microdnf clean all

# Keycloak user'a dön  
USER 1000

# Port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=180s --retries=5 \
    CMD curl -f http://localhost:8080/health/ready || exit 1

# Keycloak başlat - Railway için özel parametreler
CMD ["/opt/keycloak/bin/kc.sh", "start-dev", "--http-enabled=true", "--hostname-strict=false"] 