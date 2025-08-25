import type { FastifyInstance } from 'fastify';
declare module '@fastify/jwt' {
    interface FastifyJWT {
        payload: {
            userId: string;
            email: string;
        };
        user: {
            userId: string;
            email: string;
        };
    }
}
declare module 'fastify' {
    interface FastifyInstance {
        authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    }
}
declare const server: FastifyInstance;
export default server;
//# sourceMappingURL=server.d.ts.map