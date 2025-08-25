import type { FastifyRequest, FastifyReply } from 'fastify';
import { type User } from '../db/index.js';
export interface JWTPayload {
    userId: string;
    email: string;
    iat?: number;
    exp?: number;
}
export declare function hashPassword(password: string): Promise<string>;
export declare function verifyPassword(password: string, hash: string): Promise<boolean>;
export declare function authenticateUser(email: string, password: string): Promise<User | null>;
export declare function createRefreshToken(userId: string): Promise<string>;
export declare function validateRefreshToken(token: string): Promise<User | null>;
export declare function revokeRefreshToken(token: string): Promise<void>;
export declare function cleanupExpiredTokens(): Promise<void>;
export declare function verifyJWT(request: FastifyRequest, reply: FastifyReply): Promise<void>;
//# sourceMappingURL=index.d.ts.map