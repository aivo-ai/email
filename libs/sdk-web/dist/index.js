export const DOMAIN = 'ceerion.com';
export const HOST = 'mail.ceerion.com';
export const getEmailConfig = () => ({
    domain: DOMAIN,
    host: HOST
});
export const validateDomain = (hostname) => {
    return hostname === HOST || hostname.endsWith(`.${DOMAIN}`);
};
// Re-export all generated API functions and types
export * from './generated/api';
export * from './generated/models';
export { customInstance } from './http-client';
//# sourceMappingURL=index.js.map