import { db } from './index.js'

const migrations = [
  `
  CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
  
  CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL CHECK (email ~ '^[a-zA-Z0-9._%+-]+@ceerion\\.com$'),
    display_name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  `,
  `
  CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    thread_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    snippet TEXT,
    from_email VARCHAR(255) NOT NULL,
    from_name VARCHAR(255),
    to_emails JSONB NOT NULL,
    cc_emails JSONB DEFAULT '[]',
    bcc_emails JSONB DEFAULT '[]',
    label_ids JSONB DEFAULT '["INBOX"]',
    is_unread BOOLEAN DEFAULT true,
    size_estimate INTEGER DEFAULT 0,
    internal_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
  CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON messages(thread_id);
  CREATE INDEX IF NOT EXISTS idx_messages_internal_date ON messages(internal_date DESC);
  `,
  `
  CREATE TABLE IF NOT EXISTS trusted_senders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    domain VARCHAR(255) NOT NULL,
    email VARCHAR(255) CHECK (email IS NULL OR email ~ '^[a-zA-Z0-9._%+-]+@' || domain || '$'),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(domain, email)
  );
  
  CREATE INDEX IF NOT EXISTS idx_trusted_senders_domain ON trusted_senders(domain);
  CREATE INDEX IF NOT EXISTS idx_trusted_senders_active ON trusted_senders(is_active);
  `,
  `
  CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
  CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens(expires_at);
  `,
  `
  -- Trigger to update updated_at timestamp
  CREATE OR REPLACE FUNCTION update_updated_at_column()
  RETURNS TRIGGER AS $$
  BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
  END;
  $$ language 'plpgsql';
  
  CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
  
  CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
  
  CREATE TRIGGER update_trusted_senders_updated_at BEFORE UPDATE ON trusted_senders
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
  `
]

export async function runMigrations() {
  const client = await db.connect()
  
  try {
    await client.query('BEGIN')
    
    console.log('Running database migrations...')
    
    for (let i = 0; i < migrations.length; i++) {
      console.log(`Running migration ${i + 1}/${migrations.length}...`)
      await client.query(migrations[i])
    }
    
    await client.query('COMMIT')
    console.log('✅ All migrations completed successfully')
    
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('❌ Migration failed:', error)
    throw error
  } finally {
    client.release()
  }
}

// Run migrations if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1))
}
