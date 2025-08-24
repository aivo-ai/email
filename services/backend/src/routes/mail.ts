import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { db } from '../db/index.js'
import { 
  listMessagesSchema, 
  getMessageSchema, 
  sendEmailSchema,
  type ListMessagesQuery,
  type GetMessageParams,
  type SendEmailRequest 
} from '../schemas/backend.js'

export default async function mailRoutes(fastify: FastifyInstance) {
  // GET /mail/messages - List messages with pagination
  fastify.get<{ Querystring: ListMessagesQuery }>('/messages', {
    preValidation: [(fastify as any).authenticate],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'number', minimum: 1, default: 1 },
          limit: { type: 'number', minimum: 1, maximum: 100, default: 25 },
          folder: { type: 'string', enum: ['inbox', 'sent', 'drafts', 'trash'] },
          search: { type: 'string', maxLength: 100 },
          hasAttachments: { type: 'boolean' },
          isRead: { type: 'boolean' }
        }
      }
    }
  }, async (request: FastifyRequest<{ Querystring: ListMessagesQuery }>, reply: FastifyReply) => {
    try {
      const user = (request as any).user
      const userId = user?.userId
      if (!userId) {
        return reply.code(401).send({ error: 'Unauthorized' })
      }
      
      const query = request.query as any
      const { page = 1, limit = 25, folder, search, hasAttachments, isRead } = query
      
      // Validate with zod
      const validation = listMessagesSchema.safeParse({ page, limit, folder, search, hasAttachments, isRead })
      if (!validation.success) {
        return reply.code(400).send({
          error: 'Validation error',
          details: validation.error.errors
        })
      }
      
      const offset = (page - 1) * limit
      
      // Build dynamic query
      let whereClause = 'WHERE user_id = $1'
      const params: any[] = [userId]
      let paramIndex = 2
      
      if (folder) {
        whereClause += ` AND folder = $${paramIndex}`
        params.push(folder)
        paramIndex++
      }
      
      if (search) {
        whereClause += ` AND (subject ILIKE $${paramIndex} OR sender_email ILIKE $${paramIndex})`
        params.push(`%${search}%`)
        paramIndex++
      }
      
      if (typeof hasAttachments === 'boolean') {
        whereClause += ` AND jsonb_array_length(COALESCE(headers->'attachments', '[]'::jsonb)) ${hasAttachments ? '>' : '='} 0`
      }
      
      if (typeof isRead === 'boolean') {
        whereClause += ` AND is_read = $${paramIndex}`
        params.push(isRead)
        paramIndex++
      }
      
      // Get total count
      const countResult = await db.query(
        `SELECT COUNT(*) FROM messages ${whereClause}`,
        params
      )
      const total = parseInt(countResult.rows[0].count)
      
      // Get messages
      const messagesResult = await db.query(
        `SELECT 
          id, subject, sender_email, sender_name, 
          received_at, is_read, folder, 
          CASE 
            WHEN jsonb_array_length(COALESCE(headers->'attachments', '[]'::jsonb)) > 0 
            THEN true 
            ELSE false 
          END as has_attachments
        FROM messages 
        ${whereClause}
        ORDER BY received_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...params, limit, offset]
      )
      
      const messages = messagesResult.rows.map(row => ({
        id: row.id,
        subject: row.subject,
        senderEmail: row.sender_email,
        senderName: row.sender_name,
        receivedAt: row.received_at.toISOString(),
        isRead: row.is_read,
        folder: row.folder,
        hasAttachments: row.has_attachments
      }))
      
      reply.send({
        messages,
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
  
  // GET /mail/messages/:id - Get specific message
  fastify.get<{ Params: GetMessageParams }>('/messages/:id', {
    preValidation: [(fastify as any).authenticate],
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' }
        }
      }
    }
  }, async (request: FastifyRequest<{ Params: GetMessageParams }>, reply: FastifyReply) => {
    try {
      const user = (request as any).user
      const userId = user?.userId
      if (!userId) {
        return reply.code(401).send({ error: 'Unauthorized' })
      }
      
      const params = request.params as any
      const { id } = params
      
      const validation = getMessageSchema.safeParse({ id })
      if (!validation.success) {
        return reply.code(400).send({
          error: 'Validation error',
          details: validation.error.errors
        })
      }
      
      const result = await db.query(
        `SELECT * FROM messages WHERE id = $1 AND user_id = $2`,
        [id, userId]
      )
      
      if (result.rows.length === 0) {
        return reply.code(404).send({ error: 'Message not found' })
      }
      
      const message = result.rows[0]
      
      // Mark as read if not already
      if (!message.is_read) {
        await db.query(
          'UPDATE messages SET is_read = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
          [id]
        )
      }
      
      reply.send({
        id: message.id,
        subject: message.subject,
        senderEmail: message.sender_email,
        senderName: message.sender_name,
        body: message.body,
        htmlBody: message.html_body,
        headers: message.headers,
        receivedAt: message.received_at.toISOString(),
        isRead: true, // Now marked as read
        folder: message.folder,
        createdAt: message.created_at.toISOString(),
        updatedAt: new Date().toISOString()
      })
      
    } catch (error) {
      fastify.log.error(error)
      reply.code(500).send({ error: 'Internal server error' })
    }
  })
  
  // POST /mail/send - Send email via WebSocket to JMAP mock
  fastify.post<{ Body: SendEmailRequest }>('/send', {
    preValidation: [(fastify as any).authenticate],
    schema: {
      body: {
        type: 'object',
        required: ['to', 'subject'],
        properties: {
          to: { 
            type: 'array',
            items: { type: 'string', format: 'email' },
            minItems: 1,
            maxItems: 10
          },
          cc: { 
            type: 'array',
            items: { type: 'string', format: 'email' },
            maxItems: 10
          },
          bcc: { 
            type: 'array',
            items: { type: 'string', format: 'email' },
            maxItems: 10
          },
          subject: { type: 'string', minLength: 1, maxLength: 200 },
          body: { type: 'string', maxLength: 100000 },
          htmlBody: { type: 'string', maxLength: 100000 }
        }
      }
    }
  }, async (request: FastifyRequest<{ Body: SendEmailRequest }>, reply: FastifyReply) => {
    try {
      const user = (request as any).user
      const userId = user?.userId
      const userEmail = user?.email
      if (!userId || !userEmail) {
        return reply.code(401).send({ error: 'Unauthorized' })
      }
      
      const emailData = request.body as any
      
      const validation = sendEmailSchema.safeParse(emailData)
      if (!validation.success) {
        return reply.code(400).send({
          error: 'Validation error',
          details: validation.error.errors
        })
      }
      
      // Send to JMAP mock via WebSocket
      const payload = {
        action: 'send_email',
        data: {
          from: userEmail,
          ...emailData,
          timestamp: new Date().toISOString()
        }
      }
      
      // Note: WebSocket connection to JMAP mock will be implemented
      // For now, just return success
      fastify.log.info('Email send request queued')
      
      reply.send({
        success: true,
        messageId: `msg_${Date.now()}`,
        message: 'Email queued for sending'
      })
      
    } catch (error) {
      fastify.log.error(error)
      reply.code(500).send({ error: 'Internal server error' })
    }
  })
}
