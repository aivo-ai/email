import { authenticateUser, createRefreshToken, validateRefreshToken, revokeRefreshToken } from '../auth/index.js';
import { loginSchema, refreshTokenSchema } from '../schemas/backend.js';
export default async function authRoutes(fastify) {
    // POST /auth/login
    fastify.post('/login', {
        schema: {
            body: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                    email: { type: 'string', format: 'email', pattern: '^[a-zA-Z0-9._%+-]+@ceerion\\.com$' },
                    password: { type: 'string', minLength: 6 }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        accessToken: { type: 'string' },
                        refreshToken: { type: 'string' },
                        user: {
                            type: 'object',
                            properties: {
                                id: { type: 'string' },
                                email: { type: 'string' },
                                displayName: { type: 'string' },
                                avatarUrl: { type: 'string' },
                                isActive: { type: 'boolean' },
                                lastLoginAt: { type: 'string' },
                                createdAt: { type: 'string' }
                            }
                        }
                    }
                }
            }
        }
    }, async (request, reply) => {
        try {
            const { email, password } = request.body;
            // Validate with zod
            const validation = loginSchema.safeParse({ email, password });
            if (!validation.success) {
                return reply.code(400).send({
                    error: 'Validation error',
                    details: validation.error.errors
                });
            }
            const user = await authenticateUser(email, password);
            if (!user) {
                return reply.code(401).send({
                    error: 'Authentication failed',
                    message: 'Invalid credentials'
                });
            }
            // Generate tokens
            const accessToken = fastify.jwt.sign({ userId: user.id, email: user.email }, { expiresIn: '15m' });
            const refreshToken = await createRefreshToken(user.id);
            // Return user without sensitive data
            const userResponse = {
                id: user.id,
                email: user.email,
                displayName: user.display_name,
                avatarUrl: user.avatar_url,
                isActive: user.is_active,
                lastLoginAt: user.last_login_at?.toISOString(),
                createdAt: user.created_at.toISOString()
            };
            reply.send({
                accessToken,
                refreshToken,
                user: userResponse
            });
        }
        catch (error) {
            fastify.log.error(error);
            reply.code(500).send({ error: 'Internal server error' });
        }
    });
    // POST /auth/refresh
    fastify.post('/refresh', {
        schema: {
            body: {
                type: 'object',
                required: ['refreshToken'],
                properties: {
                    refreshToken: { type: 'string', format: 'uuid' }
                }
            }
        }
    }, async (request, reply) => {
        try {
            const { refreshToken } = request.body;
            const validation = refreshTokenSchema.safeParse({ refreshToken });
            if (!validation.success) {
                return reply.code(400).send({
                    error: 'Validation error',
                    details: validation.error.errors
                });
            }
            const user = await validateRefreshToken(refreshToken);
            if (!user) {
                return reply.code(401).send({
                    error: 'Invalid refresh token',
                    message: 'Token expired or invalid'
                });
            }
            // Revoke old token and create new ones
            await revokeRefreshToken(refreshToken);
            const newAccessToken = fastify.jwt.sign({ userId: user.id, email: user.email }, { expiresIn: '15m' });
            const newRefreshToken = await createRefreshToken(user.id);
            reply.send({
                accessToken: newAccessToken,
                refreshToken: newRefreshToken
            });
        }
        catch (error) {
            fastify.log.error(error);
            reply.code(500).send({ error: 'Internal server error' });
        }
    });
}
//# sourceMappingURL=auth.js.map