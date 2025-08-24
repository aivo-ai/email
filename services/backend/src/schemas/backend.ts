import { z } from 'zod'

// Auth schemas
export const loginSchema = z.object({
  email: z.string().email().refine((email: string) => email.endsWith('@ceerion.com'), {
    message: 'Email must be from ceerion.com domain'
  }),
  password: z.string().min(6, 'Password must be at least 6 characters')
})

export const refreshTokenSchema = z.object({
  refreshToken: z.string().uuid('Invalid refresh token format')
})

// Message schemas
export const listMessagesSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(25),
  folder: z.enum(['inbox', 'sent', 'drafts', 'trash']).optional(),
  search: z.string().max(100).optional(),
  hasAttachments: z.boolean().optional(),
  isRead: z.boolean().optional()
})

export const getMessageSchema = z.object({
  id: z.string().uuid('Invalid message ID format')
})

export const sendEmailSchema = z.object({
  to: z.array(z.string().email()).min(1, 'At least one recipient required').max(10),
  cc: z.array(z.string().email()).max(10).optional(),
  bcc: z.array(z.string().email()).max(10).optional(),
  subject: z.string().min(1, 'Subject is required').max(200),
  body: z.string().max(100000).optional(),
  htmlBody: z.string().max(100000).optional()
}).refine((data: any) => data.body || data.htmlBody, {
  message: 'Either body or htmlBody must be provided'
})

// Trusted sender schemas
export const addTrustedSenderSchema = z.object({
  email: z.string().email().optional(),
  domain: z.string().regex(/^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/, 'Invalid domain format').optional(),
  displayName: z.string().max(100).optional(),
  senderType: z.enum(['email', 'domain', 'wildcard'])
}).refine((data: any) => {
  if (data.senderType === 'email' && !data.email) {
    return false
  }
  if ((data.senderType === 'domain' || data.senderType === 'wildcard') && !data.domain) {
    return false
  }
  // Enforce ceerion.com domain restriction for email type
  if (data.email && !data.email.includes('@ceerion.com')) {
    return false
  }
  return true
}, {
  message: 'Invalid sender configuration: email type requires email field, domain/wildcard types require domain field, and emails must be from ceerion.com'
})

// Type exports
export type LoginRequest = z.infer<typeof loginSchema>
export type RefreshTokenRequest = z.infer<typeof refreshTokenSchema>
export type ListMessagesRequest = z.infer<typeof listMessagesSchema>
export type ListMessagesQuery = ListMessagesRequest
export type GetMessageRequest = z.infer<typeof getMessageSchema>
export type GetMessageParams = GetMessageRequest
export type SendEmailRequest = z.infer<typeof sendEmailSchema>
export type AddTrustedSenderRequest = z.infer<typeof addTrustedSenderSchema>
export type TrustedSenderParams = { id: string }
