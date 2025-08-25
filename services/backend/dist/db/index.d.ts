import { Pool } from 'pg';
declare const pool: Pool;
export { pool as db };
export declare function initializeDatabase(): Promise<void>;
export interface User {
    id: string;
    email: string;
    display_name: string;
    password_hash: string;
    avatar_url?: string;
    is_active: boolean;
    last_login_at?: Date;
    created_at: Date;
    updated_at: Date;
}
export interface Message {
    id: string;
    thread_id: string;
    user_id: string;
    subject: string;
    snippet: string;
    from_email: string;
    from_name?: string;
    to_emails: string[];
    cc_emails?: string[];
    bcc_emails?: string[];
    label_ids: string[];
    is_unread: boolean;
    size_estimate: number;
    internal_date: Date;
    created_at: Date;
    updated_at: Date;
}
export interface TrustedSender {
    id: string;
    domain: string;
    email?: string;
    description?: string;
    is_active: boolean;
    created_by: string;
    created_at: Date;
    updated_at: Date;
}
export interface RefreshToken {
    id: string;
    user_id: string;
    token: string;
    expires_at: Date;
    created_at: Date;
}
//# sourceMappingURL=index.d.ts.map