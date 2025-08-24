import { Pool } from 'pg'

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'ceerion_mail',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

export { pool as db }

// Initialize database connection
export async function initializeDatabase(): Promise<void> {
  try {
    const client = await pool.connect()
    console.log('📊 Database connected successfully')
    client.release()
  } catch (error) {
    console.error('❌ Database connection failed:', error)
    throw error
  }
}

export interface User {
  id: string
  email: string
  display_name: string
  password_hash: string
  avatar_url?: string
  is_active: boolean
  last_login_at?: Date
  created_at: Date
  updated_at: Date
}

export interface Message {
  id: string
  thread_id: string
  user_id: string
  subject: string
  snippet: string
  from_email: string
  from_name?: string
  to_emails: string[]
  cc_emails?: string[]
  bcc_emails?: string[]
  label_ids: string[]
  is_unread: boolean
  size_estimate: number
  internal_date: Date
  created_at: Date
  updated_at: Date
}

export interface TrustedSender {
  id: string
  domain: string
  email?: string
  description?: string
  is_active: boolean
  created_by: string
  created_at: Date
  updated_at: Date
}

export interface RefreshToken {
  id: string
  user_id: string
  token: string
  expires_at: Date
  created_at: Date
}
