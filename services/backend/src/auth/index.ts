import bcrypt from 'bcrypt'
import { v4 as uuidv4 } from 'uuid'
import type { FastifyRequest, FastifyReply } from 'fastify'
import { db, type User, type RefreshToken } from '../db/index.js'

export interface JWTPayload {
  userId: string
  email: string
  iat?: number
  exp?: number
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export async function authenticateUser(email: string, password: string): Promise<User | null> {
  const client = await db.connect()
  try {
    const result = await client.query(
      'SELECT * FROM users WHERE email = $1 AND is_active = true',
      [email]
    )
    
    if (result.rows.length === 0) {
      return null
    }
    
    const user = result.rows[0] as User
    const isValid = await verifyPassword(password, user.password_hash)
    
    if (!isValid) {
      return null
    }
    
    // Update last login
    await client.query(
      'UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    )
    
    return user
  } finally {
    client.release()
  }
}

export async function createRefreshToken(userId: string): Promise<string> {
  const client = await db.connect()
  try {
    const token = uuidv4()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days
    
    await client.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [userId, token, expiresAt]
    )
    
    return token
  } finally {
    client.release()
  }
}

export async function validateRefreshToken(token: string): Promise<User | null> {
  const client = await db.connect()
  try {
    const result = await client.query(
      `SELECT u.* FROM users u 
       JOIN refresh_tokens rt ON u.id = rt.user_id 
       WHERE rt.token = $1 AND rt.expires_at > CURRENT_TIMESTAMP AND u.is_active = true`,
      [token]
    )
    
    if (result.rows.length === 0) {
      return null
    }
    
    return result.rows[0] as User
  } finally {
    client.release()
  }
}

export async function revokeRefreshToken(token: string): Promise<void> {
  const client = await db.connect()
  try {
    await client.query('DELETE FROM refresh_tokens WHERE token = $1', [token])
  } finally {
    client.release()
  }
}

export async function cleanupExpiredTokens(): Promise<void> {
  const client = await db.connect()
  try {
    await client.query('DELETE FROM refresh_tokens WHERE expires_at <= CURRENT_TIMESTAMP')
  } finally {
    client.release()
  }
}

// JWT verification hook for protected routes
export async function verifyJWT(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify()
  } catch (err) {
    reply.code(401).send({ error: 'Unauthorized', message: 'Invalid or expired token' })
  }
}
