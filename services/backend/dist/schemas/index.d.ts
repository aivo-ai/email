import { z } from 'zod';
export declare const loginSchema: z.ZodObject<{
    email: z.ZodString;
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
    maxResults: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    pageToken: z.ZodOptional<z.ZodString>;
    labelIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    q: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    maxResults: number;
    pageToken?: string | undefined;
    labelIds?: string[] | undefined;
    q?: string | undefined;
}, {
    maxResults?: number | undefined;
    pageToken?: string | undefined;
    labelIds?: string[] | undefined;
    q?: string | undefined;
}>;
export declare const getMessageSchema: z.ZodObject<{
    id: z.ZodString;
    format: z.ZodDefault<z.ZodOptional<z.ZodEnum<["metadata", "minimal", "full"]>>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    format: "metadata" | "minimal" | "full";
}, {
    id: string;
    format?: "metadata" | "minimal" | "full" | undefined;
}>;
export declare const sendMessageSchema: z.ZodEffects<z.ZodObject<{
    to: z.ZodArray<z.ZodObject<{
        email: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        email: string;
        name?: string | undefined;
    }, {
        email: string;
        name?: string | undefined;
    }>, "many">;
    cc: z.ZodOptional<z.ZodArray<z.ZodObject<{
        email: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        email: string;
        name?: string | undefined;
    }, {
        email: string;
        name?: string | undefined;
    }>, "many">>;
    bcc: z.ZodOptional<z.ZodArray<z.ZodObject<{
        email: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        email: string;
        name?: string | undefined;
    }, {
        email: string;
        name?: string | undefined;
    }>, "many">>;
    subject: z.ZodString;
    textBody: z.ZodOptional<z.ZodString>;
    htmlBody: z.ZodOptional<z.ZodString>;
    replyTo: z.ZodOptional<z.ZodObject<{
        email: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        email: string;
        name?: string | undefined;
    }, {
        email: string;
        name?: string | undefined;
    }>>;
    attachments: z.ZodOptional<z.ZodArray<z.ZodObject<{
        filename: z.ZodString;
        contentType: z.ZodString;
        size: z.ZodNumber;
        data: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        filename: string;
        contentType: string;
        size: number;
        data: string;
    }, {
        filename: string;
        contentType: string;
        size: number;
        data: string;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    to: {
        email: string;
        name?: string | undefined;
    }[];
    subject: string;
    cc?: {
        email: string;
        name?: string | undefined;
    }[] | undefined;
    bcc?: {
        email: string;
        name?: string | undefined;
    }[] | undefined;
    htmlBody?: string | undefined;
    textBody?: string | undefined;
    replyTo?: {
        email: string;
        name?: string | undefined;
    } | undefined;
    attachments?: {
        filename: string;
        contentType: string;
        size: number;
        data: string;
    }[] | undefined;
}, {
    to: {
        email: string;
        name?: string | undefined;
    }[];
    subject: string;
    cc?: {
        email: string;
        name?: string | undefined;
    }[] | undefined;
    bcc?: {
        email: string;
        name?: string | undefined;
    }[] | undefined;
    htmlBody?: string | undefined;
    textBody?: string | undefined;
    replyTo?: {
        email: string;
        name?: string | undefined;
    } | undefined;
    attachments?: {
        filename: string;
        contentType: string;
        size: number;
        data: string;
    }[] | undefined;
}>, {
    to: {
        email: string;
        name?: string | undefined;
    }[];
    subject: string;
    cc?: {
        email: string;
        name?: string | undefined;
    }[] | undefined;
    bcc?: {
        email: string;
        name?: string | undefined;
    }[] | undefined;
    htmlBody?: string | undefined;
    textBody?: string | undefined;
    replyTo?: {
        email: string;
        name?: string | undefined;
    } | undefined;
    attachments?: {
        filename: string;
        contentType: string;
        size: number;
        data: string;
    }[] | undefined;
}, {
    to: {
        email: string;
        name?: string | undefined;
    }[];
    subject: string;
    cc?: {
        email: string;
        name?: string | undefined;
    }[] | undefined;
    bcc?: {
        email: string;
        name?: string | undefined;
    }[] | undefined;
    htmlBody?: string | undefined;
    textBody?: string | undefined;
    replyTo?: {
        email: string;
        name?: string | undefined;
    } | undefined;
    attachments?: {
        filename: string;
        contentType: string;
        size: number;
        data: string;
    }[] | undefined;
}>;
export declare const listTrustedSendersSchema: z.ZodObject<{
    domain: z.ZodOptional<z.ZodString>;
    isActive: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    domain?: string | undefined;
    isActive?: boolean | undefined;
}, {
    domain?: string | undefined;
    isActive?: boolean | undefined;
}>;
export declare const addTrustedSenderSchema: z.ZodEffects<z.ZodObject<{
    domain: z.ZodString;
    email: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    domain: string;
    email?: string | undefined;
    description?: string | undefined;
}, {
    domain: string;
    email?: string | undefined;
    description?: string | undefined;
}>, {
    domain: string;
    email?: string | undefined;
    description?: string | undefined;
}, {
    domain: string;
    email?: string | undefined;
    description?: string | undefined;
}>;
export declare const updateTrustedSenderSchema: z.ZodObject<{
    description: z.ZodOptional<z.ZodString>;
    isActive: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    isActive?: boolean | undefined;
    description?: string | undefined;
}, {
    isActive?: boolean | undefined;
    description?: string | undefined;
}>;
export declare const trustedSenderParamsSchema: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
export type LoginRequest = z.infer<typeof loginSchema>;
export type RefreshTokenRequest = z.infer<typeof refreshTokenSchema>;
export type ListMessagesRequest = z.infer<typeof listMessagesSchema>;
export type GetMessageRequest = z.infer<typeof getMessageSchema>;
export type SendMessageRequest = z.infer<typeof sendMessageSchema>;
export type ListTrustedSendersRequest = z.infer<typeof listTrustedSendersSchema>;
export type AddTrustedSenderRequest = z.infer<typeof addTrustedSenderSchema>;
export type UpdateTrustedSenderRequest = z.infer<typeof updateTrustedSenderSchema>;
export type TrustedSenderParams = z.infer<typeof trustedSenderParamsSchema>;
//# sourceMappingURL=index.d.ts.map