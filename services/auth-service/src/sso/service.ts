import passport from 'passport';
import { Strategy as SamlStrategy } from 'passport-saml';
import { Strategy as OpenIDConnectStrategy } from 'passport-openidconnect';
import { WebAuthnService } from '../webauthn/service.js';
import { SessionSecurityService } from '../session/security.js';

export interface SSOConfig {
  type: 'saml' | 'oidc';
  name: string;
  enabled: boolean;
  // SAML specific
  entryPoint?: string;
  cert?: string;
  issuer?: string;
  // OIDC specific
  clientID?: string;
  clientSecret?: string;
  discoveryURL?: string;
  scope?: string[];
  // Common
  callbackURL: string;
  requirePasskey?: boolean;
  sessionConstraints?: any;
}

export interface SSOProfile {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  provider: string;
  groups?: string[];
  attributes?: Record<string, any>;
}

export class SSOService {
  private webauthnService: WebAuthnService;
  private sessionSecurity: SessionSecurityService;
  private configs: Map<string, SSOConfig> = new Map();

  constructor(webauthnService: WebAuthnService, sessionSecurity: SessionSecurityService) {
    this.webauthnService = webauthnService;
    this.sessionSecurity = sessionSecurity;
    this.initializePassport();
  }

  private initializePassport() {
    passport.serializeUser((user: any, done) => {
      done(null, user.id);
    });

    passport.deserializeUser(async (id: string, done) => {
      // In production, fetch user from database
      done(null, { id });
    });
  }

  async configureSAML(config: SSOConfig): Promise<void> {
    if (config.type !== 'saml') {
      throw new Error('Invalid config type for SAML');
    }

    this.configs.set(config.name, config);

    const strategy = new SamlStrategy(
      {
        entryPoint: config.entryPoint!,
        cert: config.cert!,
        issuer: config.issuer!,
        callbackUrl: config.callbackURL,
        authnRequestBinding: 'HTTP-POST',
        signatureAlgorithm: 'sha256',
        digestAlgorithm: 'sha256',
      },
      async (profile: any, done: any) => {
        try {
          const ssoProfile = this.mapSAMLProfile(profile, config.name);
          const result = await this.handleSSOLogin(ssoProfile, config);
          done(null, result);
        } catch (error) {
          done(error, null);
        }
      }
    );

    passport.use(`saml-${config.name}`, strategy);
  }

  async configureOIDC(config: SSOConfig): Promise<void> {
    if (config.type !== 'oidc') {
      throw new Error('Invalid config type for OIDC');
    }

    this.configs.set(config.name, config);

    const strategy = new OpenIDConnectStrategy(
      {
        issuer: config.discoveryURL!,
        clientID: config.clientID!,
        clientSecret: config.clientSecret!,
        callbackURL: config.callbackURL,
        scope: config.scope || ['openid', 'email', 'profile'],
        skipUserProfile: false,
      },
      async (issuer: string, profile: any, done: any) => {
        try {
          const ssoProfile = this.mapOIDCProfile(profile, config.name);
          const result = await this.handleSSOLogin(ssoProfile, config);
          done(null, result);
        } catch (error) {
          done(error, null);
        }
      }
    );

    passport.use(`oidc-${config.name}`, strategy);
  }

  private mapSAMLProfile(profile: any, provider: string): SSOProfile {
    return {
      id: profile.nameID || profile.nameId,
      email: profile.email || profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'],
      firstName: profile.firstName || profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname'],
      lastName: profile.lastName || profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname'],
      displayName: profile.displayName || profile['http://schemas.microsoft.com/identity/claims/displayname'],
      provider,
      groups: profile.groups || [],
      attributes: profile,
    };
  }

  private mapOIDCProfile(profile: any, provider: string): SSOProfile {
    return {
      id: profile.id || profile.sub,
      email: profile.emails?.[0]?.value || profile.email,
      firstName: profile.name?.givenName || profile.given_name,
      lastName: profile.name?.familyName || profile.family_name,
      displayName: profile.displayName || profile.name,
      provider,
      groups: profile.groups || [],
      attributes: profile._json,
    };
  }

  private async handleSSOLogin(profile: SSOProfile, config: SSOConfig): Promise<any> {
    // Check if user exists or create
    const user = await this.findOrCreateUser(profile);

    // Check if passkey is required and enrolled
    if (config.requirePasskey) {
      const hasPasskeys = await this.webauthnService.hasUserPasskeys(user.id);
      if (!hasPasskeys) {
        throw new Error('Passkey required but not enrolled');
      }
      
      // Mark for passkey verification step
      return {
        ...user,
        requiresPasskey: true,
        ssoProfile: profile,
      };
    }

    return {
      ...user,
      ssoProfile: profile,
    };
  }

  private async findOrCreateUser(profile: SSOProfile): Promise<any> {
    // In production, query/create user in database
    return {
      id: profile.id,
      email: profile.email,
      firstName: profile.firstName,
      lastName: profile.lastName,
      displayName: profile.displayName,
      provider: profile.provider,
    };
  }

  async initiateSSO(providerName: string, req: any, res: any): Promise<void> {
    const config = this.configs.get(providerName);
    if (!config || !config.enabled) {
      throw new Error('SSO provider not found or disabled');
    }

    const strategyName = `${config.type}-${providerName}`;
    passport.authenticate(strategyName)(req, res);
  }

  async handleSSOCallback(providerName: string, req: any, res: any): Promise<any> {
    const config = this.configs.get(providerName);
    if (!config) {
      throw new Error('SSO provider not found');
    }

    return new Promise((resolve, reject) => {
      const strategyName = `${config.type}-${providerName}`;
      
      passport.authenticate(strategyName, (err: any, user: any) => {
        if (err) {
          reject(err);
          return;
        }

        if (!user) {
          reject(new Error('Authentication failed'));
          return;
        }

        resolve(user);
      })(req, res);
    });
  }

  async completePasskeyLogin(
    userId: string,
    credentialResponse: any,
    challengeId: string,
    sessionId: string,
    ipAddress: string,
    userAgent: string
  ): Promise<{ success: boolean; sessionToken?: string }> {
    // Verify passkey
    const verification = await this.webauthnService.verifyAuthentication(
      credentialResponse.id,
      credentialResponse,
      challengeId
    );

    if (!verification.verified || verification.userId !== userId) {
      return { success: false };
    }

    // Validate session constraints
    const config = Array.from(this.configs.values()).find(c => c.requirePasskey);
    if (config?.sessionConstraints) {
      const sessionValidation = await this.sessionSecurity.validateSession(
        sessionId,
        userId,
        ipAddress,
        userAgent,
        config.sessionConstraints
      );

      if (!sessionValidation.valid) {
        throw new Error(`Session blocked: ${sessionValidation.reason}`);
      }
    }

    // Generate session token
    const sessionToken = this.generateSessionToken(userId, sessionId);

    return {
      success: true,
      sessionToken,
    };
  }

  private generateSessionToken(userId: string, sessionId: string): string {
    // In production, use proper JWT with signing
    const payload = {
      userId,
      sessionId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 86400, // 24 hours
    };

    return Buffer.from(JSON.stringify(payload)).toString('base64');
  }

  async listProviders(): Promise<Array<{ name: string; type: string; enabled: boolean }>> {
    return Array.from(this.configs.values()).map(config => ({
      name: config.name,
      type: config.type,
      enabled: config.enabled,
    }));
  }

  async updateProviderConfig(name: string, config: Partial<SSOConfig>): Promise<void> {
    const existing = this.configs.get(name);
    if (!existing) {
      throw new Error('Provider not found');
    }

    const updated = { ...existing, ...config };
    this.configs.set(name, updated);

    // Reconfigure passport strategy
    if (updated.type === 'saml') {
      await this.configureSAML(updated);
    } else {
      await this.configureOIDC(updated);
    }
  }
}
