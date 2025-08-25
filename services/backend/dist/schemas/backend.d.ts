import { z } from 'zod';
export declare const loginSchema: z.ZodObject<{
    email: z.ZodEffects<z.ZodString, string, string>;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
export declare const refreshTokenSchema: z.ZodObject<{
    refreshToken: z.ZodString;
}, "strip", z.ZodTypeAny, {
    refreshToken: string;
}, {
    refreshToken: string;
}>;
export declare const listMessagesSchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    folder: z.ZodOptional<z.ZodEnum<["inbox", "sent", "drafts", "trash"]>>;
    search: z.ZodOptional<z.ZodString>;
    hasAttachments: z.ZodOptional<z.ZodBoolean>;
    isRead: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
    folder?: "inbox" | "sent" | "drafts" | "trash" | undefined;
    search?: string | undefined;
    hasAttachments?: boolean | undefined;
    isRead?: boolean | undefined;
}, {
    page?: number | undefined;
    limit?: number | undefined;
    folder?: "inbox" | "sent" | "drafts" | "trash" | undefined;
    search?: string | undefined;
    hasAttachments?: boolean | undefined;
    isRead?: boolean | undefined;
}>;
export declare const getMessageSchema: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
export declare const sendEmailSchema: z.ZodEffects<z.ZodObject<{
    to: z.ZodArray<z.ZodString, "many">;
    cc: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    bcc: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    subject: z.ZodString;
    body: z.ZodOptional<z.ZodString>;
    htmlBody: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    to: string[];
    subject: string;
    cc?: string[] | undefined;
    bcc?: string[] | undefined;
    body?: string | undefined;
    htmlBody?: string | undefined;
}, {
    to: string[];
    subject: string;
    cc?: string[] | undefined;
    bcc?: string[] | undefined;
    body?: string | undefined;
    htmlBody?: string | undefined;
}>, {
    to: string[];
    subject: string;
    cc?: string[] | undefined;
    bcc?: string[] | undefined;
    body?: string | undefined;
    htmlBody?: string | undefined;
}, {
    to: string[];
    subject: string;
    cc?: string[] | undefined;
    bcc?: string[] | undefined;
    body?: string | undefined;
    htmlBody?: string | undefined;
}>;
export declare const addTrustedSenderSchema: z.ZodEffects<z.ZodObject<{
    email: z.ZodOptional<z.ZodString>;
    domain: z.ZodOptional<z.ZodString>;
    displayName: z.ZodOptional<z.ZodString>;
    senderType: z.ZodEnum<["email", "domain", "wildcard"]>;
}, "strip", z.ZodTypeAny, {
    senderType: "email" | "domain" | "wildcard";
    email?: string | undefined;
    domain?: string | undefined;
    displayName?: string | undefined;
}, {
    senderType: "email" | "domain" | "wildcard";
    email?: string | undefined;
    domain?: string | undefined;
    displayName?: string | undefined;
}>, {
    senderType: "email" | "domain" | "wildcard";
    email?: string | undefined;
    domain?: string | undefined;
    displayName?: string | undefined;
}, {
    senderType: "email" | "domain" | "wildcard";
    email?: string | undefined;
    domain?: string | undefined;
    displayName?: string | undefined;
}>;
export type LoginRequest = z.infer<typeof loginSchema>;
export type RefreshTokenRequest = z.infer<typeof refreshTokenSchema>;
export type ListMessagesRequest = z.infer<typeof listMessagesSchema>;
export type ListMessagesQuery = ListMessagesRequest;
export type GetMessageRequest = z.infer<typeof getMessageSchema>;
export type GetMessageParams = GetMessageRequest;
export type SendEmailRequest = z.infer<typeof sendEmailSchema>;
export type AddTrustedSenderRequest = z.infer<typeof addTrustedSenderSchema>;
export type TrustedSenderParams = {
    id: string;
};
//# sourceMappingURL=backend.d.ts.map