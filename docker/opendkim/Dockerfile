# Use Debian slim as base for mail services
FROM debian:bookworm-slim

# Install supervisord and OpenDKIM
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        opendkim \
        opendkim-tools \
        supervisor \
        && rm -rf /var/lib/apt/lists/*

# Create required directories
RUN mkdir -p /etc/opendkim/keys \
             /var/log/supervisor \
             /var/run/opendkim

# Copy configuration files
COPY config/ /etc/opendkim/
COPY scripts/ /usr/local/bin/
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Set permissions
RUN chmod +x /usr/local/bin/*.sh && \
    chown -R opendkim:opendkim /etc/opendkim /var/run/opendkim

# Create volume for keys
VOLUME ["/etc/opendkim/keys"]

# Expose DKIM port
EXPOSE 8891

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD /usr/local/bin/health-check.sh

# Start supervisord
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
