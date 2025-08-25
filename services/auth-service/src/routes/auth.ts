import express, { Request, Response, NextFunction } from 'express';
import { WebAuthnService } from '../webauthn/service.js';
import { SessionSecurityService } from '../session/security.js';
import { SSOService } from '../sso/service.js';
import { z } from 'zod';

const router = express.Router();

// Validation schemas
const passkeyRegistrationSchema = z.object({
  email: z.string().email(),
  displayName: z.string().min(1),
});

const passkeyAuthSchema = z.object({
  credentialId: z.string(),
  response: z.object({
    clientDataJSON: z.string(),
    authenticatorData: z.string(),
    signature: z.string(),
    userHandle: z.string().optional(),
  }),
  challengeId: z.string(),
});

const sessionConstraintsSchema = z.object({
  allowedIPs: z.array(z.string()).optional(),
  allowedASNs: z.array(z.number()).optional(),
  allowedCountries: z.array(z.string()).optional(),
  requireKnownDevice: z.boolean().optional(),
  maxDeviceAge: z.number().optional(),
  minDeviceScore: z.number().min(0).max(100).optional(),
});

export function createAuthRouter(
  webauthnService: WebAuthnService,
  sessionSecurity: SessionSecurityService,
  ssoService: SSOService
) {
  // Passkey registration
  router.post('/passkey/register/begin', async (req: Request, res: Response) => {
    try {
      const { email, displayName } = passkeyRegistrationSchema.parse(req.body);
      
      const options = await webauthnService.generateRegistrationOptions({
        userID: email,
        userName: email,
        userDisplayName: displayName,
      });

      res.json(options);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid request' });
    }
  });

  router.post('/passkey/register/complete', async (req: Request, res: Response) => {
    try {
      const { response, challengeId, userId } = req.body;
      
      const verification = await webauthnService.verifyRegistration(
        response,
        challengeId,
        userId
      );

      if (verification.verified) {
        res.json({ 
          success: true, 
          credentialId: verification.registrationInfo?.credentialID 
        });
      } else {
        res.status(400).json({ success: false, error: 'Registration failed' });
      }
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Registration failed' });
    }
  });

  // Passkey authentication
  router.post('/passkey/authenticate/begin', async (req: Request, res: Response) => {
    try {
      const { userId } = req.body;
      
      const options = await webauthnService.generateAuthenticationOptions(userId);
      res.json(options);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid request' });
    }
  });

  router.post('/passkey/authenticate/complete', async (req: Request, res: Response) => {
    try {
      const authData = passkeyAuthSchema.parse(req.body);
      const userAgent = req.headers['user-agent'] || '';
      const ipAddress = req.ip || req.connection.remoteAddress || '';

      const verification = await webauthnService.verifyAuthentication(
        authData.credentialId,
        authData.response,
        authData.challengeId
      );

      if (!verification.verified) {
        return res.status(401).json({ success: false, error: 'Authentication failed' });
      }

      // Create session
      const sessionId = require('crypto').randomUUID();
      const sessionToken = await ssoService.completePasskeyLogin(
        verification.userId!,
        authData.response,
        authData.challengeId,
        sessionId,
        ipAddress,
        userAgent
      );

      res.json({
        success: true,
        sessionToken: sessionToken.sessionToken,
        userId: verification.userId,
      });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Authentication failed' });
    }
  });

  // SSO endpoints
  router.get('/sso/providers', async (req: Request, res: Response) => {
    try {
      const providers = await ssoService.listProviders();
      res.json(providers);
    } catch (error) {
      res.status(500).json({ error: 'Failed to list providers' });
    }
  });

  router.get('/sso/:provider/login', async (req: Request, res: Response) => {
    try {
      const { provider } = req.params;
      await ssoService.initiateSSO(provider, req, res);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'SSO initiation failed' });
    }
  });

  router.post('/sso/:provider/callback', async (req: Request, res: Response) => {
    try {
      const { provider } = req.params;
      const user = await ssoService.handleSSOCallback(provider, req, res);
      
      if (user.requiresPasskey) {
        // Return challenge for passkey verification
        const options = await webauthnService.generateAuthenticationOptions(user.id);
        res.json({
          requiresPasskey: true,
          userId: user.id,
          passkeyOptions: options,
        });
      } else {
        // Direct login success
        const sessionId = require('crypto').randomUUID();
        const sessionToken = Buffer.from(JSON.stringify({
          userId: user.id,
          sessionId,
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 86400,
        })).toString('base64');

        res.json({
          success: true,
          sessionToken,
          user,
        });
      }
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'SSO callback failed' });
    }
  });

  // Session validation
  router.post('/session/validate', async (req: Request, res: Response) => {
    try {
      const { sessionToken, constraints } = req.body;
      const userAgent = req.headers['user-agent'] || '';
      const ipAddress = req.ip || req.connection.remoteAddress || '';

      // Decode session token
      const payload = JSON.parse(Buffer.from(sessionToken, 'base64').toString());
      
      if (payload.exp < Math.floor(Date.now() / 1000)) {
        return res.status(401).json({ valid: false, reason: 'Session expired' });
      }

      // Validate constraints if provided
      if (constraints) {
        const validationResult = await sessionSecurity.validateSession(
          payload.sessionId,
          payload.userId,
          ipAddress,
          userAgent,
          sessionConstraintsSchema.parse(constraints)
        );

        if (!validationResult.valid) {
          return res.status(403).json({
            valid: false,
            reason: validationResult.reason,
            riskScore: validationResult.riskScore,
          });
        }
      }

      res.json({
        valid: true,
        userId: payload.userId,
        sessionId: payload.sessionId,
      });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Session validation failed' });
    }
  });

  // Device management
  router.get('/user/:userId/devices', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const devices = await sessionSecurity.getUserDevices(userId);
      res.json(devices);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get devices' });
    }
  });

  router.delete('/user/:userId/device/:deviceId', async (req: Request, res: Response) => {
    try {
      const { userId, deviceId } = req.params;
      await sessionSecurity.revokeDevice(userId, deviceId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to revoke device' });
    }
  });

  // Passkey management
  router.get('/user/:userId/passkeys', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const passkeys = await webauthnService.getUserPasskeys(userId);
      res.json(passkeys);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get passkeys' });
    }
  });

  router.delete('/user/:userId/passkey/:credentialId', async (req: Request, res: Response) => {
    try {
      const { userId, credentialId } = req.params;
      await webauthnService.removeUserPasskey(userId, credentialId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to remove passkey' });
    }
  });

  // Admin endpoints
  router.put('/admin/sso/:provider', async (req: Request, res: Response) => {
    try {
      const { provider } = req.params;
      await ssoService.updateProviderConfig(provider, req.body);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to update provider' });
    }
  });

  router.get('/admin/audit/:userId', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { startDate, endDate, eventType } = req.query;
      
      const events = await sessionSecurity.getAuditLog(
        userId,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined,
        eventType as string
      );
      
      res.json(events);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get audit log' });
    }
  });

  // Health check
  router.get('/health', (req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        webauthn: 'operational',
        sso: 'operational',
        session: 'operational',
      },
    });
  });

  return router;
}

// Middleware for session authentication
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  try {
    const token = authHeader.substring(7);
    const payload = JSON.parse(Buffer.from(token, 'base64').toString());
    
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return res.status(401).json({ error: 'Session expired' });
    }

    req.user = {
      id: payload.userId,
      sessionId: payload.sessionId,
    };

    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid session token' });
  }
}

// Middleware for admin authentication
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  // In production, check user role from database
  const user = req.user as any;
  if (!user?.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}
