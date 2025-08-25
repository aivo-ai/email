import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import session from 'express-session';
import passport from 'passport';
import { WebAuthnService } from './webauthn/service.js';
import { SessionSecurityService } from './session/security.js';
import { SSOService } from './sso/service.js';
import { createAuthRouter, requireAuth, requireAdmin } from './routes/auth.js';

export class AuthServer {
  private app: express.Application;
  private webauthnService: WebAuthnService;
  private sessionSecurity: SessionSecurityService;
  private ssoService: SSOService;

  constructor() {
    this.app = express();
    this.webauthnService = new WebAuthnService();
    this.sessionSecurity = new SessionSecurityService();
    this.ssoService = new SSOService(this.webauthnService, this.sessionSecurity);
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupSSO();
  }

  private setupMiddleware() {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"], // For WebAuthn
          styleSrc: ["'self'", "'unsafe-inline'"],
          connectSrc: ["'self'", "https:"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
      crossOriginEmbedderPolicy: false, // For WebAuthn
    }));

    // CORS
    this.app.use(cors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
      credentials: true,
      optionsSuccessStatus: 200,
    }));

    // Rate limiting
    this.app.use('/api/auth', rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // Limit each IP to 100 requests per windowMs
      message: 'Too many authentication attempts',
      standardHeaders: true,
      legacyHeaders: false,
    }));

    // Stricter rate limiting for registration
    this.app.use('/api/auth/passkey/register', rateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 5, // Limit registration attempts
      message: 'Too many registration attempts',
    }));

    // Body parsing
    this.app.use(express.json({ limit: '1mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '1mb' }));

    // Session management
    this.app.use(session({
      secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'strict',
      },
    }));

    // Passport initialization
    this.app.use(passport.initialize());
    this.app.use(passport.session());

    // Request logging
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
      next();
    });
  }

  private setupRoutes() {
    // Auth routes
    const authRouter = createAuthRouter(
      this.webauthnService,
      this.sessionSecurity,
      this.ssoService
    );
    
    this.app.use('/api/auth', authRouter);

    // Protected routes example
    this.app.get('/api/user/profile', requireAuth, (req, res) => {
      const user = req.user as any;
      res.json({
        id: user.id,
        sessionId: user.sessionId,
        timestamp: new Date().toISOString(),
      });
    });

    // Admin routes example
    this.app.get('/api/admin/stats', requireAuth, requireAdmin, (req, res) => {
      res.json({
        totalUsers: 1000, // Mock data
        activeDevices: 1500,
        ssoProviders: 3,
        timestamp: new Date().toISOString(),
      });
    });

    // Error handling
    this.app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('Auth service error:', err);
      res.status(500).json({
        error: 'Internal server error',
        requestId: req.headers['x-request-id'] || 'unknown',
      });
    });

    // 404 handler
    this.app.use((req: express.Request, res: express.Response) => {
      res.status(404).json({
        error: 'Endpoint not found',
        path: req.path,
      });
    });
  }

  private async setupSSO() {
    // Example SAML configuration
    if (process.env.SAML_ENABLED === 'true') {
      await this.ssoService.configureSAML({
        type: 'saml',
        name: 'corporate',
        enabled: true,
        entryPoint: process.env.SAML_ENTRY_POINT!,
        cert: process.env.SAML_CERT!,
        issuer: process.env.SAML_ISSUER!,
        callbackURL: `${process.env.BASE_URL}/api/auth/sso/corporate/callback`,
        requirePasskey: process.env.SAML_REQUIRE_PASSKEY === 'true',
        sessionConstraints: {
          allowedCountries: process.env.SAML_ALLOWED_COUNTRIES?.split(','),
          requireKnownDevice: true,
          minDeviceScore: 70,
        },
      });
    }

    // Example OIDC configuration
    if (process.env.OIDC_ENABLED === 'true') {
      await this.ssoService.configureOIDC({
        type: 'oidc',
        name: 'azure',
        enabled: true,
        clientID: process.env.OIDC_CLIENT_ID!,
        clientSecret: process.env.OIDC_CLIENT_SECRET!,
        discoveryURL: process.env.OIDC_DISCOVERY_URL!,
        callbackURL: `${process.env.BASE_URL}/api/auth/sso/azure/callback`,
        scope: ['openid', 'email', 'profile'],
        requirePasskey: process.env.OIDC_REQUIRE_PASSKEY === 'true',
        sessionConstraints: {
          requireKnownDevice: false,
          minDeviceScore: 50,
        },
      });
    }
  }

  public getApp(): express.Application {
    return this.app;
  }

  public async start(port: number = 3001): Promise<void> {
    return new Promise((resolve) => {
      this.app.listen(port, () => {
        console.log(`Auth service listening on port ${port}`);
        console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`Base URL: ${process.env.BASE_URL || `http://localhost:${port}`}`);
        resolve();
      });
    });
  }

  public async stop(): Promise<void> {
    // Graceful shutdown logic
    console.log('Stopping auth service...');
  }
}

// Start server if run directly
if (require.main === module) {
  const server = new AuthServer();
  
  const port = parseInt(process.env.PORT || '3001');
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

export default AuthServer;
