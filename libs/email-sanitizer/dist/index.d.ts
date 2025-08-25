export interface SanitizeOptions {
    allowImages?: boolean;
    mediaProxyUrl?: string;
    cidEndpointUrl?: string;
    messageId?: string;
}
/**
 * Sanitize HTML email content for safe display
 * - Strips all scripts and potentially dangerous content
 * - Replaces img src with data-ce-src to block images by default
 * - Optionally allows images through media proxy
 * - Resolves cid: URLs to CID endpoint
 */
export declare function sanitizeEmailHtml(html: string, options?: SanitizeOptions): string;
/**
 * Extract plain text from HTML email content
 */
export declare function extractPlainText(html: string): string;
/**
 * Generate a preview snippet from email content
 */
export declare function generateEmailPreview(html: string, maxLength?: number): string;
/**
 * Check if HTML content contains potentially dangerous elements
 */
export declare function detectUnsafeContent(html: string): {
    hasScripts: boolean;
    hasExternalImages: boolean;
    hasInlineImages: boolean;
    hasExternalLinks: boolean;
    hasDangerousAttributes: boolean;
};
export declare const sanitizeHtmlEmail: typeof sanitizeEmailHtml;
export declare const stripHtmlTags: (html: string) => string;
export declare const validateEmailContent: (content: string) => boolean;
declare const _default: {
    sanitizeEmailHtml: typeof sanitizeEmailHtml;
    extractPlainText: typeof extractPlainText;
    generateEmailPreview: typeof generateEmailPreview;
    detectUnsafeContent: typeof detectUnsafeContent;
    sanitizeHtmlEmail: typeof sanitizeEmailHtml;
    stripHtmlTags: (html: string) => string;
    validateEmailContent: (content: string) => boolean;
};
export default _default;
//# sourceMappingURL=index.d.ts.map