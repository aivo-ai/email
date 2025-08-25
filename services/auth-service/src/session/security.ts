import geoip from 'geoip-lite';
import UAParser from 'ua-parser-js';
import { z } from 'zod';

export interface SessionConstraints {
  allowedCountries?: string[];
  blockedCountries?: string[];
  allowedASNs?: number[];
  blockedASNs?: number[];
  requireSameIP?: boolean;
  requireSameDevice?: boolean;
  maxConcurrentSessions?: number;
  sessionTimeout?: number; // in seconds
}

export interface DevicePosture {
  isManaged?: boolean;
  hasAntiVirus?: boolean;
  hasFirewall?: boolean;
  encryptionEnabled?: boolean;
  osVersion?: string;
  lastPatched?: Date;
  riskScore?: number; // 0-100
}

export interface SessionInfo {
  sessionId: string;
  userId: string;
  ipAddress: string;
  userAgent: string;
  country?: string;
  asn?: number;
  device: {
    type: string;
    os: string;
    browser: string;
    fingerprint: string;
  };
  posture?: DevicePosture;
  createdAt: Date;
  lastActivity: Date;
  isBlocked: boolean;
  blockReason?: string;
  riskScore: number;
}

const SessionConstraintsSchema = z.object({
  allowedCountries: z.array(z.string()).optional(),
  blockedCountries: z.array(z.string()).optional(),
  allowedASNs: z.array(z.number()).optional(),
  blockedASNs: z.array(z.number()).optional(),
  requireSameIP: z.boolean().default(false),
  requireSameDevice: z.boolean().default(false),
  maxConcurrentSessions: z.number().default(5),
  sessionTimeout: z.number().default(86400), // 24 hours
});

export class SessionSecurityService {
  private sessions: Map<string, SessionInfo> = new Map();
  private userSessions: Map<string, Set<string>> = new Map();

  async validateSession(
    sessionId: string,
    userId: string,
    ipAddress: string,
    userAgent: string,
    constraints: SessionConstraints,
    posture?: DevicePosture
  ): Promise<{ valid: boolean; reason?: string; riskScore: number }> {
    const validatedConstraints = SessionConstraintsSchema.parse(constraints);
    
    // Get geolocation info
    const geo = geoip.lookup(ipAddress);
    const country = geo?.country;
    const asn = await this.getASN(ipAddress);

    // Parse user agent
    const parser = new UAParser(userAgent);
    const device = {
      type: parser.getDevice().type || 'desktop',
      os: parser.getOS().name || 'unknown',
      browser: parser.getBrowser().name || 'unknown',
      fingerprint: this.generateDeviceFingerprint(userAgent, ipAddress),
    };

    // Calculate base risk score
    let riskScore = this.calculateRiskScore(ipAddress, country, device, posture);

    // Check constraints
    const validationResult = this.checkConstraints(
      ipAddress,
      country,
      asn,
      device,
      validatedConstraints,
      userId
    );

    if (!validationResult.valid) {
      riskScore = Math.max(riskScore, 80); // High risk for constraint violations
    }

    // Additional risk factors
    if (this.isKnownVPN(ipAddress)) riskScore += 20;
    if (this.isKnownTor(ipAddress)) riskScore += 40;
    if (this.hasRecentFailedLogins(userId, ipAddress)) riskScore += 15;

    const sessionInfo: SessionInfo = {
      sessionId,
      userId,
      ipAddress,
      userAgent,
      country,
      asn,
      device,
      posture,
      createdAt: new Date(),
      lastActivity: new Date(),
      isBlocked: !validationResult.valid || riskScore > 75,
      blockReason: validationResult.reason,
      riskScore,
    };

    // Store session
    this.sessions.set(sessionId, sessionInfo);
    
    // Track user sessions
    if (!this.userSessions.has(userId)) {
      this.userSessions.set(userId, new Set());
    }
    this.userSessions.get(userId)!.add(sessionId);

    // Log audit event
    await this.auditSessionEvent(sessionInfo, validationResult.valid ? 'ALLOWED' : 'BLOCKED');

    return {
      valid: validationResult.valid && riskScore <= 75,
      reason: validationResult.reason,
      riskScore,
    };
  }

  private checkConstraints(
    ipAddress: string,
    country: string | undefined,
    asn: number | undefined,
    device: any,
    constraints: SessionConstraints,
    userId: string
  ): { valid: boolean; reason?: string } {
    // Country restrictions
    if (constraints.allowedCountries && country && !constraints.allowedCountries.includes(country)) {
      return { valid: false, reason: `Country ${country} not allowed` };
    }

    if (constraints.blockedCountries && country && constraints.blockedCountries.includes(country)) {
      return { valid: false, reason: `Country ${country} is blocked` };
    }

    // ASN restrictions
    if (constraints.allowedASNs && asn && !constraints.allowedASNs.includes(asn)) {
      return { valid: false, reason: `ASN ${asn} not allowed` };
    }

    if (constraints.blockedASNs && asn && constraints.blockedASNs.includes(asn)) {
      return { valid: false, reason: `ASN ${asn} is blocked` };
    }

    // Same IP requirement
    if (constraints.requireSameIP) {
      const existingSessions = this.getUserSessions(userId);
      const hasValidIP = existingSessions.some(session => session.ipAddress === ipAddress);
      if (existingSessions.length > 0 && !hasValidIP) {
        return { valid: false, reason: 'IP address change not allowed' };
      }
    }

    // Same device requirement
    if (constraints.requireSameDevice) {
      const existingSessions = this.getUserSessions(userId);
      const hasValidDevice = existingSessions.some(session => 
        session.device.fingerprint === device.fingerprint
      );
      if (existingSessions.length > 0 && !hasValidDevice) {
        return { valid: false, reason: 'Device change not allowed' };
      }
    }

    // Concurrent session limit
    const userSessions = this.getUserSessions(userId);
    if (userSessions.length >= constraints.maxConcurrentSessions!) {
      return { valid: false, reason: 'Maximum concurrent sessions exceeded' };
    }

    return { valid: true };
  }

  private calculateRiskScore(
    ipAddress: string,
    country: string | undefined,
    device: any,
    posture?: DevicePosture
  ): number {
    let score = 0;

    // Base geographic risk
    const highRiskCountries = ['CN', 'RU', 'KP', 'IR'];
    if (country && highRiskCountries.includes(country)) score += 25;

    // Device posture scoring
    if (posture) {
      if (!posture.isManaged) score += 15;
      if (!posture.hasAntiVirus) score += 10;
      if (!posture.hasFirewall) score += 10;
      if (!posture.encryptionEnabled) score += 15;
      if (posture.riskScore) score += posture.riskScore * 0.3;
    }

    // Unknown device type
    if (device.type === 'unknown') score += 10;

    return Math.min(score, 100);
  }

  private generateDeviceFingerprint(userAgent: string, ipAddress: string): string {
    // Simple fingerprinting - in production, use more sophisticated methods
    const data = `${userAgent}:${ipAddress}`;
    return Buffer.from(data).toString('base64').substring(0, 16);
  }

  private getUserSessions(userId: string): SessionInfo[] {
    const sessionIds = this.userSessions.get(userId) || new Set();
    return Array.from(sessionIds)
      .map(id => this.sessions.get(id))
      .filter((session): session is SessionInfo => session !== undefined);
  }

  private async getASN(ipAddress: string): Promise<number | undefined> {
    // In production, use MaxMind or similar service
    return undefined;
  }

  private isKnownVPN(ipAddress: string): boolean {
    // In production, check against VPN/proxy databases
    return false;
  }

  private isKnownTor(ipAddress: string): boolean {
    // In production, check against Tor exit node lists
    return false;
  }

  private hasRecentFailedLogins(userId: string, ipAddress: string): boolean {
    // In production, check failed login attempts in the last hour
    return false;
  }

  private async auditSessionEvent(session: SessionInfo, action: 'ALLOWED' | 'BLOCKED'): Promise<void> {
    const auditEvent = {
      timestamp: new Date(),
      userId: session.userId,
      sessionId: session.sessionId,
      action,
      ipAddress: session.ipAddress,
      country: session.country,
      device: session.device,
      riskScore: session.riskScore,
      blockReason: session.blockReason,
    };

    // In production, store in audit log
    console.log('Session audit event:', auditEvent);
  }

  async updateSessionActivity(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivity = new Date();
    }
  }

  async terminateSession(sessionId: string, reason: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.isBlocked = true;
      session.blockReason = reason;
      
      // Remove from user sessions
      const userSessions = this.userSessions.get(session.userId);
      if (userSessions) {
        userSessions.delete(sessionId);
      }

      await this.auditSessionEvent(session, 'BLOCKED');
    }
  }

  async cleanupExpiredSessions(): Promise<void> {
    const now = new Date();
    const expiredSessions: string[] = [];

    for (const [sessionId, session] of this.sessions) {
      const sessionAge = now.getTime() - session.lastActivity.getTime();
      if (sessionAge > 86400000) { // 24 hours
        expiredSessions.push(sessionId);
      }
    }

    for (const sessionId of expiredSessions) {
      await this.terminateSession(sessionId, 'Session expired');
      this.sessions.delete(sessionId);
    }
  }
}
