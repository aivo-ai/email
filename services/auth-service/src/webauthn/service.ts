import { 
  verifyRegistrationResponse, 
  verifyAuthenticationResponse,
  generateRegistrationOptions,
  generateAuthenticationOptions,
  type VerifiedRegistrationResponse,
  type VerifiedAuthenticationResponse
} from '@simplewebauthn/server';
import { z } from 'zod';

export interface PasskeyCredential {
  id: string;
  userId: string;
  credentialId: string;
  publicKey: string;
  counter: number;
  deviceType: 'singleDevice' | 'multiDevice';
  backedUp: boolean;
  transports?: AuthenticatorTransport[];
  createdAt: Date;
  lastUsed?: Date;
  nickname?: string;
}

export interface PasskeyRegistrationRequest {
  userId: string;
  nickname?: string;
  requireUserVerification?: boolean;
}

export interface PasskeyAuthenticationRequest {
  userId?: string;
  allowCredentials?: string[];
}

const RegistrationOptionsSchema = z.object({
  userId: z.string(),
  nickname: z.string().optional(),
  requireUserVerification: z.boolean().default(true),
});

const AuthenticationOptionsSchema = z.object({
  userId: z.string().optional(),
  allowCredentials: z.array(z.string()).optional(),
});

export class WebAuthnService {
  private rpID: string;
  private rpName: string;
  private origin: string;
  private credentialStore: Map<string, PasskeyCredential> = new Map();

  constructor(rpID: string, rpName: string, origin: string) {
    this.rpID = rpID;
    this.rpName = rpName;
    this.origin = origin;
  }

  async generateRegistrationOptions(request: PasskeyRegistrationRequest) {
    const { userId, nickname, requireUserVerification } = RegistrationOptionsSchema.parse(request);

    // Get existing credentials for this user
    const existingCredentials = await this.getUserCredentials(userId);
    
    const options = await generateRegistrationOptions({
      rpName: this.rpName,
      rpID: this.rpID,
      userID: userId,
      userName: `user-${userId}`,
      userDisplayName: nickname || `User ${userId}`,
      attestationType: 'none',
      excludeCredentials: existingCredentials.map(cred => ({
        id: cred.credentialId,
        type: 'public-key',
        transports: cred.transports,
      })),
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: requireUserVerification ? 'required' : 'preferred',
        authenticatorAttachment: 'platform',
      },
      supportedAlgorithmIDs: [-7, -257], // ES256, RS256
    });

    // Store challenge for verification
    await this.storeChallenge(userId, options.challenge, 'registration');

    return options;
  }

  async verifyRegistration(
    userId: string,
    credential: any,
    expectedChallenge: string
  ): Promise<{ verified: boolean; credentialId?: string }> {
    try {
      const verification: VerifiedRegistrationResponse = await verifyRegistrationResponse({
        response: credential,
        expectedChallenge,
        expectedOrigin: this.origin,
        expectedRPID: this.rpID,
        requireUserVerification: true,
      });

      if (verification.verified && verification.registrationInfo) {
        const { credentialPublicKey, credentialID, counter, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

        // Store the credential
        const passkeyCredential: PasskeyCredential = {
          id: crypto.randomUUID(),
          userId,
          credentialId: Buffer.from(credentialID).toString('base64url'),
          publicKey: Buffer.from(credentialPublicKey).toString('base64url'),
          counter,
          deviceType: credentialDeviceType,
          backedUp: credentialBackedUp,
          createdAt: new Date(),
        };

        await this.storeCredential(passkeyCredential);

        return {
          verified: true,
          credentialId: passkeyCredential.credentialId,
        };
      }

      return { verified: false };
    } catch (error) {
      console.error('WebAuthn registration verification failed:', error);
      return { verified: false };
    }
  }

  async generateAuthenticationOptions(request: PasskeyAuthenticationRequest) {
    const { userId, allowCredentials } = AuthenticationOptionsSchema.parse(request);

    let credentialIds: string[] = [];
    
    if (userId) {
      const userCredentials = await this.getUserCredentials(userId);
      credentialIds = userCredentials.map(cred => cred.credentialId);
    } else if (allowCredentials) {
      credentialIds = allowCredentials;
    }

    const options = await generateAuthenticationOptions({
      rpID: this.rpID,
      allowCredentials: credentialIds.map(id => ({
        id: id,
        type: 'public-key',
        transports: ['internal', 'hybrid'], // Support platform and cross-platform
      })),
      userVerification: 'preferred',
    });

    // Store challenge for verification
    const challengeId = crypto.randomUUID();
    await this.storeChallenge(challengeId, options.challenge, 'authentication');

    return { ...options, challengeId };
  }

  async verifyAuthentication(
    credentialId: string,
    credential: any,
    expectedChallenge: string
  ): Promise<{ verified: boolean; userId?: string }> {
    try {
      const storedCredential = await this.getCredential(credentialId);
      if (!storedCredential) {
        return { verified: false };
      }

      const verification: VerifiedAuthenticationResponse = await verifyAuthenticationResponse({
        response: credential,
        expectedChallenge,
        expectedOrigin: this.origin,
        expectedRPID: this.rpID,
        authenticator: {
          credentialID: Buffer.from(storedCredential.credentialId, 'base64url'),
          credentialPublicKey: Buffer.from(storedCredential.publicKey, 'base64url'),
          counter: storedCredential.counter,
          transports: storedCredential.transports,
        },
        requireUserVerification: true,
      });

      if (verification.verified) {
        // Update counter and last used
        await this.updateCredentialCounter(credentialId, verification.authenticationInfo.newCounter);
        
        return {
          verified: true,
          userId: storedCredential.userId,
        };
      }

      return { verified: false };
    } catch (error) {
      console.error('WebAuthn authentication verification failed:', error);
      return { verified: false };
    }
  }

  async getUserCredentials(userId: string): Promise<PasskeyCredential[]> {
    // In production, this would query the database
    const credentials: PasskeyCredential[] = [];
    for (const [_, credential] of this.credentialStore) {
      if (credential.userId === userId) {
        credentials.push(credential);
      }
    }
    return credentials;
  }

  async hasUserPasskeys(userId: string): Promise<boolean> {
    const credentials = await this.getUserCredentials(userId);
    return credentials.length > 0;
  }

  async removeCredential(credentialId: string): Promise<boolean> {
    return this.credentialStore.delete(credentialId);
  }

  private async storeCredential(credential: PasskeyCredential): Promise<void> {
    // In production, store in database
    this.credentialStore.set(credential.credentialId, credential);
  }

  private async getCredential(credentialId: string): Promise<PasskeyCredential | undefined> {
    return this.credentialStore.get(credentialId);
  }

  private async updateCredentialCounter(credentialId: string, newCounter: number): Promise<void> {
    const credential = this.credentialStore.get(credentialId);
    if (credential) {
      credential.counter = newCounter;
      credential.lastUsed = new Date();
      this.credentialStore.set(credentialId, credential);
    }
  }

  private async storeChallenge(id: string, challenge: string, type: 'registration' | 'authentication'): Promise<void> {
    // In production, store in Redis with TTL
    console.log(`Storing ${type} challenge for ${id}: ${challenge}`);
  }
}
