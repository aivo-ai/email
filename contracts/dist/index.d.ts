export interface EmailAddress {
    email: string;
    name?: string;
}
export interface EmailMessage {
    id: string;
    subject: string;
    from: EmailAddress;
    to: EmailAddress[];
    cc?: EmailAddress[];
    bcc?: EmailAddress[];
    replyTo?: EmailAddress;
    date: string;
    textBody?: string;
    htmlBody?: string;
    attachments?: EmailAttachment[];
}
export interface EmailAttachment {
    id: string;
    filename: string;
    contentType: string;
    size: number;
    cid?: string;
}
export interface Mailbox {
    id: string;
    name: string;
    role?: 'inbox' | 'sent' | 'drafts' | 'trash' | 'archive' | 'junk';
    parentId?: string;
    sortOrder: number;
    totalEmails: number;
    unreadEmails: number;
}
export interface EmailThread {
    id: string;
    emailIds: string[];
}
export interface SearchQuery {
    text?: string;
    from?: string;
    to?: string;
    subject?: string;
    before?: string;
    after?: string;
    hasAttachment?: boolean;
    inMailbox?: string;
}
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}
export declare const DOMAIN_CONFIG: {
    readonly domain: "ceerion.com";
    readonly host: "mail.ceerion.com";
};
//# sourceMappingURL=index.d.ts.map