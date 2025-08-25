import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { JournalingService } from './journaling.js';
import { createJournalingRouter } from './routes/journaling.js';

export class JournalingServer {
  private app: express.Application;
  private journalingService: JournalingService;

  constructor() {
    this.app = express();
    this.journalingService = new JournalingService(
      process.env.AWS_REGION || 'us-east-1',
      process.env.S3_BUCKET || 'email-journal',
      process.env.GLACIER_VAULT || 'email-archive'
    );
    
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

    // Rate limiting
    this.app.use('/api/journaling', rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // Higher limit for journaling operations
      message: 'Too many journaling requests',
    }));

    // Body parsing
    this.app.use(express.json({ limit: '10mb' })); // Larger limit for email content
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
      next();
    });
  }

  private setupRoutes() {
    // Journaling routes
    const journalingRouter = createJournalingRouter(this.journalingService);
    this.app.use('/api/journaling', journalingRouter);

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        service: 'journaling-service',
        version: '1.0.0',
        status: 'operational',
        timestamp: new Date().toISOString(),
      });
    });

    // Error handling
    this.app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('Journaling service error:', err);
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
        service: 'journaling-service',
      });
    });
  }

  public getApp(): express.Application {
    return this.app;
  }

  public async start(port: number = 3002): Promise<void> {
    return new Promise((resolve) => {
      this.app.listen(port, () => {
        console.log(`Journaling service listening on port ${port}`);
        console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`S3 Bucket: ${process.env.S3_BUCKET || 'email-journal'}`);
        console.log(`Glacier Vault: ${process.env.GLACIER_VAULT || 'email-archive'}`);
        resolve();
      });
    });
  }

  public async stop(): Promise<void> {
    console.log('Stopping journaling service...');
  }
}

// Start server if run directly
if (require.main === module) {
  const server = new JournalingServer();
  
  const port = parseInt(process.env.PORT || '3002');
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

export default JournalingServer;
