import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { db } from './index.js';
export async function seedDatabase() {
    const client = await db.connect();
    try {
        await client.query('BEGIN');
        console.log('Seeding database...');
        // Check if data already exists
        const existingUsers = await client.query('SELECT COUNT(*) FROM users');
        if (parseInt(existingUsers.rows[0].count) > 0) {
            console.log('Database already seeded, skipping...');
            await client.query('ROLLBACK');
            return;
        }
        // Create test users
        const users = [
            {
                id: uuidv4(),
                email: 'admin@ceerion.com',
                display_name: 'Admin User',
                password_hash: await bcrypt.hash('admin123', 10)
            },
            {
                id: uuidv4(),
                email: 'user@ceerion.com',
                display_name: 'Test User',
                password_hash: await bcrypt.hash('user123', 10)
            },
            {
                id: uuidv4(),
                email: 'demo@ceerion.com',
                display_name: 'Demo User',
                password_hash: await bcrypt.hash('demo123', 10)
            }
        ];
        console.log('Creating users...');
        for (const user of users) {
            await client.query('INSERT INTO users (id, email, display_name, password_hash) VALUES ($1, $2, $3, $4)', [user.id, user.email, user.display_name, user.password_hash]);
        }
        // Create test messages for the first user
        const testUserId = users[0].id;
        const threadId = uuidv4();
        const messages = [
            {
                id: uuidv4(),
                thread_id: threadId,
                user_id: testUserId,
                subject: 'Welcome to Ceerion Mail',
                snippet: 'Thank you for joining Ceerion Mail. This is your first message...',
                from_email: 'welcome@ceerion.com',
                from_name: 'Ceerion Team',
                to_emails: JSON.stringify([users[0].email]),
                size_estimate: 1024
            },
            {
                id: uuidv4(),
                thread_id: uuidv4(),
                user_id: testUserId,
                subject: 'Security Alert: New Login',
                snippet: 'We detected a new login to your account from a new device...',
                from_email: 'security@ceerion.com',
                from_name: 'Ceerion Security',
                to_emails: JSON.stringify([users[0].email]),
                label_ids: JSON.stringify(['INBOX', 'IMPORTANT']),
                size_estimate: 756
            },
            {
                id: uuidv4(),
                thread_id: uuidv4(),
                user_id: testUserId,
                subject: 'Monthly Newsletter - Platform Updates',
                snippet: 'Check out the latest features and improvements to the platform...',
                from_email: 'newsletter@ceerion.com',
                from_name: 'Ceerion Updates',
                to_emails: JSON.stringify([users[0].email]),
                label_ids: JSON.stringify(['INBOX', 'NEWSLETTERS']),
                is_unread: false,
                size_estimate: 2048
            }
        ];
        console.log('Creating messages...');
        for (const message of messages) {
            await client.query(`INSERT INTO messages (
          id, thread_id, user_id, subject, snippet, from_email, from_name,
          to_emails, label_ids, is_unread, size_estimate
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`, [
                message.id, message.thread_id, message.user_id, message.subject,
                message.snippet, message.from_email, message.from_name,
                message.to_emails, message.label_ids || '["INBOX"]',
                message.is_unread !== false, message.size_estimate
            ]);
        }
        // Create trusted senders
        const trustedSenders = [
            {
                id: uuidv4(),
                domain: 'ceerion.com',
                description: 'Official Ceerion domain',
                created_by: testUserId
            },
            {
                id: uuidv4(),
                domain: 'github.com',
                description: 'GitHub notifications and updates',
                created_by: testUserId
            },
            {
                id: uuidv4(),
                domain: 'linkedin.com',
                email: 'noreply@linkedin.com',
                description: 'LinkedIn professional notifications',
                created_by: testUserId
            }
        ];
        console.log('Creating trusted senders...');
        for (const sender of trustedSenders) {
            await client.query('INSERT INTO trusted_senders (id, domain, email, description, created_by) VALUES ($1, $2, $3, $4, $5)', [sender.id, sender.domain, sender.email, sender.description, sender.created_by]);
        }
        await client.query('COMMIT');
        console.log('✅ Database seeded successfully');
        console.log('Test credentials:');
        console.log('  - admin@ceerion.com / admin123');
        console.log('  - user@ceerion.com / user123');
        console.log('  - demo@ceerion.com / demo123');
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Seeding failed:', error);
        throw error;
    }
    finally {
        client.release();
    }
}
// Run seeding if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    seedDatabase()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}
//# sourceMappingURL=seed.js.map