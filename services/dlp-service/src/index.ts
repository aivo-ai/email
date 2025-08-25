import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { DLPService } from './dlp.js';
import { createDLPRouter } from './routes/dlp.js';

export class DLPServer {
  private app: express.Application;
  private dlpService: DLPService;

  constructor() {
    this.app = express();
    this.dlpService = new DLPService();
    
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

    // Rate limiting - stricter for DLP scanning
    this.app.use('/api/dlp', rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 500, // 500 requests per window
      message: 'Too many DLP scan requests',
    }));

    // Body parsing with larger limits for content scanning
    this.app.use(express.json({ limit: '50mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '50mb' }));

    // Request logging
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
      next();
    });
  }

  private setupRoutes() {
    // DLP routes
    const dlpRouter = createDLPRouter(this.dlpService);
    this.app.use('/api/dlp', dlpRouter);

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        service: 'dlp-service',
        version: '1.0.0',
        status: 'operational',
        timestamp: new Date().toISOString(),
        rulesLoaded: this.dlpService.getRules().length,
      });
    });

    // Error handling
    this.app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('DLP service error:', err);
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
        service: 'dlp-service',
      });
    });
  }

  public getApp(): express.Application {
    return this.app;
  }

  public async start(port: number = 3003): Promise<void> {
    return new Promise((resolve) => {
      this.app.listen(port, () => {
        console.log(`DLP service listening on port ${port}`);
        console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`Rules loaded: ${this.dlpService.getRules().length}`);
        resolve();
      });
    });
  }

  public async stop(): Promise<void> {
    console.log('Stopping DLP service...');
  }
}

// Start server if run directly
if (require.main === module) {
  const server = new DLPServer();
  
  const port = parseInt(process.env.PORT || '3003');
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

export default DLPServer;
