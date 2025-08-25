import { fastify } from 'fastify';
import { searchRoutes } from './routes/search.js';
import { ingestorRoutes } from './routes/ingestors.js';
import { OpenSearchClient } from './lib/opensearch.js';
import { IngestorService } from './services/ingestor.js';
import { SearchService } from './services/search.js';
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
const openSearchClient = new OpenSearchClient(config.openSearch);
const ingestorService = new IngestorService(config.database, openSearchClient);
const searchService = new SearchService(openSearchClient);

// Decorate fastify instance with services
server.decorate('openSearch', openSearchClient);
server.decorate('ingestor', ingestorService);
server.decorate('search', searchService);

// Register routes
await server.register(searchRoutes, { prefix: '/api/search' });
await server.register(ingestorRoutes, { prefix: '/api/ingest' });

// Health check
server.get('/health', async () => {
  try {
    await openSearchClient.ping();
    return { status: 'healthy', timestamp: new Date().toISOString() };
  } catch (error) {
    server.log.error(error, 'Health check failed');
    throw server.httpErrors.serviceUnavailable('Service unhealthy');
  }
});

// Start server
async function start() {
  try {
    await server.listen({ 
      port: config.port, 
      host: config.host 
    });
    server.log.info(`Search service started on ${config.host}:${config.port}`);
  } catch (error) {
    server.log.error(error);
    process.exit(1);
  }
}

start();
