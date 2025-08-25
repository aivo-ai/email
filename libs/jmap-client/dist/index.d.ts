export interface JMAPClient {
    listMessages(options?: ListMessagesOptions): Promise<Message[]>;
    getMessage(id: string): Promise<Message | null>;
    sendMessage(message: SendMessageRequest): Promise<{
        id: string;
    }>;
    connectPush(onMessage: (message: Message) => void): Promise<() => void>;
}
export interface ListMessagesOptions {
    limit?: number;
    offset?: number;
    threadId?: string;
    hasAttachment?: boolean;
    isUnread?: boolean;
    labels?: string[];
}
export interface Message {
    id: string;
    threadId: string;
    subject: string;
    snippet: string;
    from: EmailAddress[];
    to: EmailAddress[];
    cc?: EmailAddress[];
    bcc?: EmailAddress[];
    receivedAt: string;
    isUnread: boolean;
    labelIds: string[];
    sizeEstimate: number;
    bodyText?: string;
    bodyHtml?: string;
    attachments?: Attachment[];
}
export interface EmailAddress {
    name?: string;
    email: string;
}
export interface Attachment {
    id: string;
    filename: string;
    mimeType: string;
    size: number;
    inline: boolean;
}
export interface SendMessageRequest {
    to: EmailAddress[];
    cc?: EmailAddress[];
    bcc?: EmailAddress[];
    subject: string;
    bodyText?: string;
    bodyHtml?: string;
    attachments?: File[];
}
export interface JMAPClientOptions {
    baseUrl: string;
    maxRetries?: number;
    initialRetryDelay?: number;
    maxRetryDelay?: number;
}
/**
 * JMAP client with exponential backoff retry logic
 */
export declare class JMAPClientImpl implements JMAPClient {
    private baseUrl;
    private maxRetries;
    private initialRetryDelay;
    private maxRetryDelay;
    private wsConnection;
    constructor(options: JMAPClientOptions);
    private sleep;
    private calculateRetryDelay;
    private fetchWithRetry;
    listMessages(options?: ListMessagesOptions): Promise<Message[]>;
    getMessage(id: string): Promise<Message | null>;
    sendMessage(message: SendMessageRequest): Promise<{
        id: string;
    }>;
    private fileToBase64;
    connectPush(onMessage: (message: Message) => void): Promise<() => void>;
    private reconnectWebSocket;
}
/**
 * Create a JMAP client instance
 */
export declare function createJMAPClient(options: JMAPClientOptions): JMAPClient;
export interface JMAPRequest {
    using: string[];
    methodCalls: Array<[string, any, string]>;
}
export interface JMAPResponse {
    methodResponses: Array<[string, any, string]>;
    sessionState: string;
}
declare const _default: {
    createJMAPClient: typeof createJMAPClient;
    JMAPClientImpl: typeof JMAPClientImpl;
};
export default _default;
//# sourceMappingURL=index.d.ts.map