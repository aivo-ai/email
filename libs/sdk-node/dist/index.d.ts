import type { paths, components } from './types.js';
export declare const DOMAIN = "ceerion.com";
export declare const HOST = "mail.ceerion.com";
export interface EmailServerConfig {
    domain: string;
    host: string;
    port?: number;
    ssl?: boolean;
    apiUrl: string;
}
export declare const getServerConfig: () => EmailServerConfig;
export declare const validateServerDomain: (hostname: string) => boolean;
export type User = components['schemas']['User'];
export type Message = components['schemas']['Message'];
export type SendRequest = components['schemas']['SendRequest'];
export type Label = components['schemas']['Label'];
export type Error = components['schemas']['Error'];
type LoginResponse = paths['/auth/login']['post']['responses']['200']['content']['application/json'];
export declare class CeerionAPIClient {
    private apiUrl;
    private accessToken?;
    constructor(apiUrl?: string);
    setAccessToken(token: string): void;
    private request;
    login(email: string, password: string): Promise<LoginResponse>;
    getCurrentUser(): Promise<User>;
    listMessages(params?: paths['/mail/messages:list']['post']['requestBody']['content']['application/json']): Promise<{
        messages: components["schemas"]["Message"][];
        nextPageToken?: string;
        resultSizeEstimate: number;
    }>;
    getMessage(id: string, format?: 'metadata' | 'minimal' | 'full'): Promise<{
        id: string;
        threadId: string;
        labelIds: string[];
        snippet: string;
        sizeEstimate: number;
        historyId?: string;
        internalDate?: string;
        payload?: {
            partId?: string;
            mimeType?: string;
            filename?: string;
            headers?: {
                name: string;
                value: string;
            }[];
            body?: {
                size?: number;
                data?: string;
            };
            parts?: components["schemas"]["MessagePart"][];
        };
    }>;
    sendMessage(sendRequest: SendRequest): Promise<{
        id: string;
        threadId: string;
        labelIds?: string[];
    }>;
}
export {};
//# sourceMappingURL=index.d.ts.map