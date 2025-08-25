export declare const DOMAIN = "ceerion.com";
export declare const HOST = "mail.ceerion.com";
export interface EmailConfig {
    domain: string;
    host: string;
}
export declare const getEmailConfig: () => EmailConfig;
export declare const validateDomain: (hostname: string) => boolean;
export * from './generated/api';
export * from './generated/models';
export { customInstance } from './http-client';
//# sourceMappingURL=index.d.ts.map