import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { CDRService } from './cdr.js';
import { createCDRRouter } from './routes/cdr.js';

export class CDRServer {
  private app: express.Application;
  private cdrService: CDRService;

  constructor() {
    this.app = express();
    this.cdrService = new CDRService();
    
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

    // Rate limiting - moderate for file processing
    this.app.use('/api/cdr', rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 200, // 200 file uploads per window
      message: 'Too many file processing requests',
    }));

    // Body parsing with large limits for file uploads
    this.app.use(express.json({ limit: '100mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '100mb' }));

    // Request logging
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
      next();
    });
  }

  private setupRoutes() {
    // CDR routes
    const cdrRouter = createCDRRouter(this.cdrService);
    this.app.use('/api/cdr', cdrRouter);

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        service: 'cdr-service',
        version: '1.0.0',
        status: 'operational',
        timestamp: new Date().toISOString(),
        policiesLoaded: this.cdrService.getPolicies().length,
      });
    });

    // Error handling
    this.app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('CDR service error:', err);
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
        service: 'cdr-service',
      });
    });
  }

  public getApp(): express.Application {
    return this.app;
  }

  public async start(port: number = 3005): Promise<void> {
    return new Promise((resolve) => {
      this.app.listen(port, () => {
        console.log(`CDR service listening on port ${port}`);
        console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`Policies loaded: ${this.cdrService.getPolicies().length}`);
        resolve();
      });
    });
  }

  public async stop(): Promise<void> {
    console.log('Stopping CDR service...');
  }
}

// Start server if run directly
if (require.main === module) {
  const server = new CDRServer();
  
  const port = parseInt(process.env.PORT || '3005');
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

export default CDRServer;
