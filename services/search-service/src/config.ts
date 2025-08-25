export const config = {
  port: parseInt(process.env.PORT || '3003'),
  host: process.env.HOST || '0.0.0.0',
  logLevel: process.env.LOG_LEVEL || 'info',
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'],
  
  openSearch: {
    node: process.env.OPENSEARCH_URL || 'https://localhost:9200',
    auth: {
      username: process.env.OPENSEARCH_USERNAME || 'admin',
      password: process.env.OPENSEARCH_PASSWORD || 'admin'
    },
    ssl: {
      rejectUnauthorized: process.env.NODE_ENV === 'production'
    }
  },
  
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'mail',
    username: process.env.DB_USER || 'mail',
    password: process.env.DB_PASSWORD || 'password'
  },
  
  tika: {
    url: process.env.TIKA_URL || 'http://localhost:9998'
  },
  
  search: {
    maxResults: 100,
    highlightLength: 200,
    performanceTarget: 200 // ms for p95
  }
};
