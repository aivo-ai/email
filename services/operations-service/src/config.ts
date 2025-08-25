export const config = {
  port: parseInt(process.env.PORT || '3004'),
  host: process.env.HOST || '0.0.0.0',
  logLevel: process.env.LOG_LEVEL || 'info',
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'],
  
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'mail',
    username: process.env.DB_USER || 'mail',
    password: process.env.DB_PASSWORD || 'password'
  },
  
  smtp: {
    host: process.env.SMTP_HOST || 'localhost',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || ''
    }
  },
  
  dmarc: {
    domain: process.env.DMARC_DOMAIN || 'ceerion.com',
    rua: process.env.DMARC_RUA || 'mailto:dmarc-reports@ceerion.com',
    ruf: process.env.DMARC_RUF || 'mailto:dmarc-failures@ceerion.com',
    policy: process.env.DMARC_POLICY || 'quarantine',
    percentage: parseInt(process.env.DMARC_PERCENTAGE || '100')
  },
  
  mtaSts: {
    mode: process.env.MTA_STS_MODE || 'enforce',
    maxAge: parseInt(process.env.MTA_STS_MAX_AGE || '604800'),
    mx: process.env.MTA_STS_MX?.split(',') || ['mail.ceerion.com']
  },
  
  tlsRpt: {
    rua: process.env.TLS_RUA || 'mailto:tls-reports@ceerion.com'
  },
  
  dsn: {
    retryAttempts: parseInt(process.env.DSN_RETRY_ATTEMPTS || '3'),
    retryDelays: [300, 1800, 3600, 86400], // 5min, 30min, 1hr, 24hr
    maxAge: parseInt(process.env.DSN_MAX_AGE || '432000'), // 5 days
    suppressionAge: parseInt(process.env.SUPPRESSION_AGE || '2592000') // 30 days
  }
};
