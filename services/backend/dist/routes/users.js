import { db } from '../db/index.js';
export default async function userRoutes(fastify) {
    // GET /users/me - Get current user profile
    fastify.get('/me', {
        preValidation: [fastify.authenticate],
        schema: {
            response: {
                200: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        email: { type: 'string' },
                        displayName: { type: 'string' },
                        avatarUrl: { type: 'string' },
                        isActive: { type: 'boolean' },
                        lastLoginAt: { type: 'string' },
                        createdAt: { type: 'string' },
                        updatedAt: { type: 'string' }
                    }
                }
            }
        }
    }, async (request, reply) => {
        try {
            const user = request.user;
            const userId = user?.userId;
            if (!userId) {
                return reply.code(401).send({ error: 'Unauthorized' });
            }
            const result = await db.query('SELECT id, email, display_name, avatar_url, is_active, last_login_at, created_at, updated_at FROM users WHERE id = $1 AND is_active = true', [userId]);
            if (result.rows.length === 0) {
                return reply.code(404).send({ error: 'User not found' });
            }
            const userRecord = result.rows[0];
            reply.send({
                id: userRecord.id,
                email: userRecord.email,
                displayName: userRecord.display_name,
                avatarUrl: userRecord.avatar_url,
                isActive: userRecord.is_active,
                lastLoginAt: userRecord.last_login_at?.toISOString(),
                createdAt: userRecord.created_at.toISOString(),
                updatedAt: userRecord.updated_at.toISOString()
            });
        }
        catch (error) {
            fastify.log.error(error);
            reply.code(500).send({ error: 'Internal server error' });
        }
    });
}
//# sourceMappingURL=users.js.map