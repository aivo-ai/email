import { fastify } from 'fastify';
import { dmarcRoutes } from './routes/dmarc.js';
import { dsnRoutes } from './routes/dsn.js';
import { tlsRptRoutes } from './routes/tls-rpt.js';
import { adminRoutes } from './routes/admin.js';
import { DMARCService } from './services/dmarc.js';
import { DSNService } from './services/dsn.js';
import { TLSRPTService } from './services/tls-rpt.js';
import { ReportsService } from './services/reports.js';
import { CronService } from './services/cron.js';
import { config } from './config.js';

const server = fastify({
  logger: {
    level: config.logLevel,
    transport: process.env.NODE_ENV === 'development' ? {
      target: 'pino-pretty'
    } : undefined
  }
});

// Register plugins
await server.register(import('@fastify/cors'), {
  origin: config.allowedOrigins
});

await server.register(import('@fastify/helmet'), {
  contentSecurityPolicy: false
});

// Initialize services
const dmarcService = new DMARCService(config.database);
const dsnService = new DSNService(config.database, config.smtp);
const tlsRptService = new TLSRPTService(config.database);
const reportsService = new ReportsService(config.database);
const cronService = new CronService({
  dmarcService,
  dsnService,
  tlsRptService,
  reportsService
});

// Decorate fastify instance with services
server.decorate('dmarc', dmarcService);
server.decorate('dsn', dsnService);
server.decorate('tlsRpt', tlsRptService);
server.decorate('reports', reportsService);

// Register routes
await server.register(dmarcRoutes, { prefix: '/api/dmarc' });
await server.register(dsnRoutes, { prefix: '/api/dsn' });
await server.register(tlsRptRoutes, { prefix: '/api/tls-rpt' });
await server.register(adminRoutes, { prefix: '/api/admin' });

// Health check
server.get('/health', async () => {
  return { 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    services: {
      dmarc: 'active',
      dsn: 'active',
      tlsRpt: 'active',
      reports: 'active'
    }
  };
});

// Metrics endpoint
server.get('/metrics', async () => {
  return {
    dmarc: await dmarcService.getMetrics(),
    dsn: await dsnService.getMetrics(),
    tlsRpt: await tlsRptService.getMetrics()
  };
});

// Start server and cron jobs
async function start() {
  try {
    await server.listen({ 
      port: config.port, 
      host: config.host 
    });
    
    // Start background jobs
    await cronService.start();
    
    server.log.info(`Operations service started on ${config.host}:${config.port}`);
  } catch (error) {
    server.log.error(error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  server.log.info('Shutting down gracefully...');
  await cronService.stop();
  await server.close();
  process.exit(0);
});

start();
