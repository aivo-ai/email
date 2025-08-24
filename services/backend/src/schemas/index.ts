import { z } from 'zod'

// Domain validation for ceerion.com emails
const ceerionEmailSchema = z.string().email().regex(
  /^[a-zA-Z0-9._%+-]+@ceerion\.com$/,
  'Email must be from ceerion.com domain'
)

// Auth schemas
export const loginSchema = z.object({
  email: ceerionEmailSchema,
  password: z.string().min(6, 'Password must be at least 6 characters')
})

export const refreshTokenSchema = z.object({
  refreshToken: z.string().uuid('Invalid refresh token format')
})

// Message schemas
export const listMessagesSchema = z.object({
  maxResults: z.number().int().positive().max(50).optional().default(10),
  pageToken: z.string().optional(),
  labelIds: z.array(z.string()).optional(),
  q: z.string().optional() // Search query
})

export const getMessageSchema = z.object({
  id: z.string().uuid('Invalid message ID'),
  format: z.enum(['metadata', 'minimal', 'full']).optional().default('full')
})

export const sendMessageSchema = z.object({
  to: z.array(z.object({
    email: ceerionEmailSchema,
    name: z.string().optional()
  })).min(1, 'At least one recipient is required'),
  cc: z.array(z.object({
    email: ceerionEmailSchema,
    name: z.string().optional()
  })).optional(),
  bcc: z.array(z.object({
    email: ceerionEmailSchema,
    name: z.string().optional()
  })).optional(),
  subject: z.string().min(1, 'Subject is required').max(998, 'Subject too long'),
  textBody: z.string().optional(),
  htmlBody: z.string().optional(),
  replyTo: z.object({
    email: ceerionEmailSchema,
    name: z.string().optional()
  }).optional(),
  attachments: z.array(z.object({
    filename: z.string(),
    contentType: z.string(),
    size: z.number().positive(),
    data: z.string() // Base64 encoded
  })).optional()
}).refine(
  data => data.textBody || data.htmlBody,
  { message: 'Either textBody or htmlBody is required' }
)

// Trusted senders schemas
export const listTrustedSendersSchema = z.object({
  domain: z.string().optional(),
  isActive: z.boolean().optional()
})

export const addTrustedSenderSchema = z.object({
  domain: z.string().min(1, 'Domain is required'),
  email: z.string().email().optional(),
  description: z.string().max(500).optional()
}).refine(
  data => !data.email || data.email.endsWith(`@${data.domain}`),
  { message: 'Email must belong to the specified domain' }
)

export const updateTrustedSenderSchema = z.object({
  description: z.string().max(500).optional(),
  isActive: z.boolean().optional()
})

export const trustedSenderParamsSchema = z.object({
  id: z.string().uuid('Invalid trusted sender ID')
})

// Utility type exports
export type LoginRequest = z.infer<typeof loginSchema>
export type RefreshTokenRequest = z.infer<typeof refreshTokenSchema>
export type ListMessagesRequest = z.infer<typeof listMessagesSchema>
export type GetMessageRequest = z.infer<typeof getMessageSchema>
export type SendMessageRequest = z.infer<typeof sendMessageSchema>
export type ListTrustedSendersRequest = z.infer<typeof listTrustedSendersSchema>
export type AddTrustedSenderRequest = z.infer<typeof addTrustedSenderSchema>
export type UpdateTrustedSenderRequest = z.infer<typeof updateTrustedSenderSchema>
export type TrustedSenderParams = z.infer<typeof trustedSenderParamsSchema>
