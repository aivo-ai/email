# Use Debian slim as base for mail services
FROM debian:bookworm-slim

# Install Dovecot and required packages
RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
        dovecot-core \
        dovecot-imapd \
        dovecot-pop3d \
        dovecot-lmtpd \
        dovecot-managesieved \
        dovecot-pgsql \
        supervisor \
        rsyslog \
        ca-certificates \
        && rm -rf /var/lib/apt/lists/*

# Create required directories
RUN mkdir -p /var/log/supervisor \
             /var/mail/vhosts \
             /etc/dovecot/sql

# Copy configuration files
COPY config/ /etc/dovecot/
COPY jmap-proxy/ /etc/dovecot/jmap-proxy/
COPY scripts/ /usr/local/bin/
COPY sieve/ /etc/dovecot/sieve/
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Set permissions
RUN chmod +x /usr/local/bin/*.sh && \
    groupadd -g 5000 vmail && \
    useradd -g vmail -u 5000 vmail -d /var/mail/vhosts -m && \
    chown -R vmail:vmail /var/mail/vhosts

# Expose IMAP, POP3, LMTP, and Sieve ports
EXPOSE 110 143 993 995 24 4190

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD /usr/local/bin/health-check.sh

# Start supervisord
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
