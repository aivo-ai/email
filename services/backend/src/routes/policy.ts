import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { db } from '../db/index.js'
import { 
  addTrustedSenderSchema, 
  type AddTrustedSenderRequest,
  type TrustedSenderParams 
} from '../schemas/backend.js'

export default async function policyRoutes(fastify: FastifyInstance) {
  // GET /policy/trusted-senders - List trusted senders
  fastify.get('/trusted-senders', {
    preValidation: [fastify.authenticate],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'number', minimum: 1, default: 1 },
          limit: { type: 'number', minimum: 1, maximum: 100, default: 25 },
          search: { type: 'string', maxLength: 100 }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = request.user?.userId
      if (!userId) {
        return reply.code(401).send({ error: 'Unauthorized' })
      }
      
      const query = request.query as any
      const { page = 1, limit = 25, search } = query
      const offset = (page - 1) * limit
      
      let whereClause = 'WHERE user_id = $1'
      const params: any[] = [userId]
      let paramIndex = 2
      
      if (search) {
        whereClause += ` AND (email ILIKE $${paramIndex} OR domain ILIKE $${paramIndex} OR display_name ILIKE $${paramIndex})`
        params.push(`%${search}%`)
        paramIndex++
      }
      
      // Get total count
      const countResult = await db.query(
        `SELECT COUNT(*) FROM trusted_senders ${whereClause}`,
        params
      )
      const total = parseInt(countResult.rows[0].count)
      
      // Get trusted senders
      const result = await db.query(
        `SELECT id, email, domain, display_name, sender_type, created_at, updated_at 
         FROM trusted_senders 
         ${whereClause}
         ORDER BY created_at DESC
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...params, limit, offset]
      )
      
      const senders = result.rows.map(row => ({
        id: row.id,
        email: row.email,
        domain: row.domain,
        displayName: row.display_name,
        senderType: row.sender_type,
        createdAt: row.created_at.toISOString(),
        updatedAt: row.updated_at.toISOString()
      }))
      
      reply.send({
        senders,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      })
      
    } catch (error) {
      fastify.log.error(error)
      reply.code(500).send({ error: 'Internal server error' })
    }
  })
  
  // POST /policy/trusted-senders - Add trusted sender
  fastify.post<{ Body: AddTrustedSenderRequest }>('/trusted-senders', {
    preValidation: [fastify.authenticate],
    schema: {
      body: {
        type: 'object',
        required: ['senderType'],
        properties: {
          email: { type: 'string', format: 'email' },
          domain: { type: 'string', pattern: '^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$' },
          displayName: { type: 'string', maxLength: 100 },
          senderType: { type: 'string', enum: ['email', 'domain', 'wildcard'] }
        }
      }
    }
  }, async (request: FastifyRequest<{ Body: AddTrustedSenderRequest }>, reply: FastifyReply) => {
    try {
      const userId = request.user?.userId
      if (!userId) {
        return reply.code(401).send({ error: 'Unauthorized' })
      }
      
      const senderData = request.body
      
      const validation = addTrustedSenderSchema.safeParse(senderData)
      if (!validation.success) {
        return reply.code(400).send({
          error: 'Validation error',
          details: validation.error.errors
        })
      }
      
      // Check for duplicates
      const existingResult = await db.query(
        'SELECT id FROM trusted_senders WHERE user_id = $1 AND (email = $2 OR domain = $3)',
        [userId, senderData.email || null, senderData.domain || null]
      )
      
      if (existingResult.rows.length > 0) {
        return reply.code(409).send({
          error: 'Duplicate entry',
          message: 'This sender is already in your trusted list'
        })
      }
      
      const result = await db.query(
        `INSERT INTO trusted_senders (user_id, email, domain, display_name, sender_type)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          userId,
          senderData.email || null,
          senderData.domain || null,
          senderData.displayName || null,
          senderData.senderType
        ]
      )
      
      const sender = result.rows[0]
      reply.code(201).send({
        id: sender.id,
        email: sender.email,
        domain: sender.domain,
        displayName: sender.display_name,
        senderType: sender.sender_type,
        createdAt: sender.created_at.toISOString(),
        updatedAt: sender.updated_at.toISOString()
      })
      
    } catch (error) {
      fastify.log.error(error)
      reply.code(500).send({ error: 'Internal server error' })
    }
  })
  
  // DELETE /policy/trusted-senders/:id - Remove trusted sender
  fastify.delete<{ Params: TrustedSenderParams }>('/trusted-senders/:id', {
    preValidation: [fastify.authenticate],
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' }
        }
      }
    }
  }, async (request: FastifyRequest<{ Params: TrustedSenderParams }>, reply: FastifyReply) => {
    try {
      const userId = request.user?.userId
      if (!userId) {
        return reply.code(401).send({ error: 'Unauthorized' })
      }
      
      const { id } = request.params
      
      const result = await db.query(
        'DELETE FROM trusted_senders WHERE id = $1 AND user_id = $2 RETURNING id',
        [id, userId]
      )
      
      if (result.rows.length === 0) {
        return reply.code(404).send({ error: 'Trusted sender not found' })
      }
      
      reply.code(204).send()
      
    } catch (error) {
      fastify.log.error(error)
      reply.code(500).send({ error: 'Internal server error' })
    }
  })
}
