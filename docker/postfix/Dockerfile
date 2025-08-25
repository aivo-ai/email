# Use Debian slim as base for mail services
FROM debian:bookworm-slim

# Install Postfix and required packages
RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
        postfix \
        postfix-pgsql \
        supervisor \
        rsyslog \
        ca-certificates \
        && rm -rf /var/lib/apt/lists/*

# Create required directories
RUN mkdir -p /var/log/supervisor \
             /var/spool/postfix \
             /etc/postfix/sql

# Copy configuration files
COPY config/ /etc/postfix/
COPY sql/ /etc/postfix/sql/
COPY scripts/ /usr/local/bin/
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Set permissions
RUN chmod +x /usr/local/bin/*.sh && \
    postconf -e "myhostname = mail.example.com" && \
    postconf -e "mydestination = localhost" && \
    postconf -e "relayhost ="

# Create postfix user if it doesn't exist
RUN groupadd -f postfix && useradd -r -g postfix postfix || true

# Set proper ownership
RUN chown -R postfix:postfix /var/spool/postfix

# Expose SMTP ports
EXPOSE 25 587

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD /usr/local/bin/health-check.sh

# Start supervisord
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
