import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { SLOService } from './slo.js';
import { createSLORouter } from './routes/slo.js';

export class SLOServer {
  private app: express.Application;
  private sloService: SLOService;

  constructor() {
    this.app = express();
    this.sloService = new SLOService();
    
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware() {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          connectSrc: ["'self'"],
        },
      },
    }));

    // CORS
    this.app.use(cors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
      credentials: true,
    }));

    // Compression
    this.app.use(compression());

    // Body parsing
    this.app.use(express.json({ limit: '1mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '1mb' }));

    // Request logging
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
      next();
    });
  }

  private setupRoutes() {
    // SLO routes
    const sloRouter = createSLORouter(this.sloService);
    this.app.use('/api/slo', sloRouter);

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        service: 'slo-service',
        version: '1.0.0',
        status: 'operational',
        timestamp: new Date().toISOString(),
        slosMonitored: this.sloService.getSLOs().length,
        experimentsConfigured: this.sloService.getExperiments().length,
      });
    });

    // Error handling
    this.app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('SLO service error:', err);
      res.status(500).json({
        error: 'Internal server error',
        requestId: req.headers['x-request-id'] || 'unknown',
        timestamp: new Date().toISOString(),
      });
    });

    // 404 handler
    this.app.use((req: express.Request, res: express.Response) => {
      res.status(404).json({
        error: 'Endpoint not found',
        path: req.path,
        service: 'slo-service',
      });
    });
  }

  public getApp(): express.Application {
    return this.app;
  }

  public async start(port: number = 3004): Promise<void> {
    return new Promise((resolve) => {
      this.app.listen(port, () => {
        console.log(`SLO service listening on port ${port}`);
        console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`SLOs monitored: ${this.sloService.getSLOs().length}`);
        console.log(`Chaos experiments: ${this.sloService.getExperiments().length}`);
        resolve();
      });
    });
  }

  public async stop(): Promise<void> {
    console.log('Stopping SLO service...');
  }
}

// Start server if run directly
if (require.main === module) {
  const server = new SLOServer();
  
  const port = parseInt(process.env.PORT || '3004');
  server.start(port).catch(console.error);

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully');
    await server.stop();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down gracefully');
    await server.stop();
    process.exit(0);
  });
}

export default SLOServer;
