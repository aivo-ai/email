import type { DataTag, DefinedInitialDataOptions, DefinedUseQueryResult, QueryClient, QueryKey, UndefinedInitialDataOptions, UseMutationOptions, UseMutationResult, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import type { AddTrustedSender201, AddTrustedSenderBody, Error, GetDmarcSummary200, GetDmarcSummaryBody, GetMessageBody, ListMessages200, ListMessagesBody, ListTrustedSenders200, ListTrustedSendersParams, Login200, LoginBody, Message, RefreshToken200, RefreshTokenBody, SendMessage200, SendRequest, User } from './models';
import { customInstance } from '../http-client';
type SecondParameter<T extends (...args: never) => unknown> = Parameters<T>[1];
/**
 * @summary Authenticate user
 */
export declare const login: (loginBody: LoginBody, options?: SecondParameter<typeof customInstance>, signal?: AbortSignal) => Promise<Login200>;
export declare const getLoginMutationOptions: <TError = Error, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof login>>, TError, {
        data: LoginBody;
    }, TContext>;
    request?: SecondParameter<typeof customInstance>;
}) => UseMutationOptions<Awaited<ReturnType<typeof login>>, TError, {
    data: LoginBody;
}, TContext>;
export type LoginMutationResult = NonNullable<Awaited<ReturnType<typeof login>>>;
export type LoginMutationBody = LoginBody;
export type LoginMutationError = Error;
/**
* @summary Authenticate user
*/
export declare const useLogin: <TError = Error, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof login>>, TError, {
        data: LoginBody;
    }, TContext>;
    request?: SecondParameter<typeof customInstance>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof login>>, TError, {
    data: LoginBody;
}, TContext>;
/**
 * @summary Refresh access token
 */
export declare const refreshToken: (refreshTokenBody: RefreshTokenBody, options?: SecondParameter<typeof customInstance>, signal?: AbortSignal) => Promise<RefreshToken200>;
export declare const getRefreshTokenMutationOptions: <TError = Error, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof refreshToken>>, TError, {
        data: RefreshTokenBody;
    }, TContext>;
    request?: SecondParameter<typeof customInstance>;
}) => UseMutationOptions<Awaited<ReturnType<typeof refreshToken>>, TError, {
    data: RefreshTokenBody;
}, TContext>;
export type RefreshTokenMutationResult = NonNullable<Awaited<ReturnType<typeof refreshToken>>>;
export type RefreshTokenMutationBody = RefreshTokenBody;
export type RefreshTokenMutationError = Error;
/**
* @summary Refresh access token
*/
export declare const useRefreshToken: <TError = Error, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof refreshToken>>, TError, {
        data: RefreshTokenBody;
    }, TContext>;
    request?: SecondParameter<typeof customInstance>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof refreshToken>>, TError, {
    data: RefreshTokenBody;
}, TContext>;
/**
 * @summary Get current user profile
 */
export declare const getCurrentUser: (options?: SecondParameter<typeof customInstance>, signal?: AbortSignal) => Promise<User>;
export declare const getGetCurrentUserQueryKey: () => readonly ["/users/me"];
export declare const getGetCurrentUserQueryOptions: <TData = Awaited<ReturnType<typeof getCurrentUser>>, TError = Error>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof getCurrentUser>>, TError, TData>>;
    request?: SecondParameter<typeof customInstance>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getCurrentUser>>, TError, TData> & {
    queryKey: DataTag<QueryKey, TData>;
};
export type GetCurrentUserQueryResult = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
export type GetCurrentUserQueryError = Error;
export declare function useGetCurrentUser<TData = Awaited<ReturnType<typeof getCurrentUser>>, TError = Error>(options: {
    query: Partial<UseQueryOptions<Awaited<ReturnType<typeof getCurrentUser>>, TError, TData>> & Pick<DefinedInitialDataOptions<Awaited<ReturnType<typeof getCurrentUser>>, TError, Awaited<ReturnType<typeof getCurrentUser>>>, 'initialData'>;
    request?: SecondParameter<typeof customInstance>;
}, queryClient?: QueryClient): DefinedUseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData>;
};
export declare function useGetCurrentUser<TData = Awaited<ReturnType<typeof getCurrentUser>>, TError = Error>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof getCurrentUser>>, TError, TData>> & Pick<UndefinedInitialDataOptions<Awaited<ReturnType<typeof getCurrentUser>>, TError, Awaited<ReturnType<typeof getCurrentUser>>>, 'initialData'>;
    request?: SecondParameter<typeof customInstance>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData>;
};
export declare function useGetCurrentUser<TData = Awaited<ReturnType<typeof getCurrentUser>>, TError = Error>(options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof getCurrentUser>>, TError, TData>>;
    request?: SecondParameter<typeof customInstance>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData>;
};
/**
 * @summary List email messages
 */
export declare const listMessages: (listMessagesBody: ListMessagesBody, options?: SecondParameter<typeof customInstance>, signal?: AbortSignal) => Promise<ListMessages200>;
export declare const getListMessagesMutationOptions: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof listMessages>>, TError, {
        data: ListMessagesBody;
    }, TContext>;
    request?: SecondParameter<typeof customInstance>;
}) => UseMutationOptions<Awaited<ReturnType<typeof listMessages>>, TError, {
    data: ListMessagesBody;
}, TContext>;
export type ListMessagesMutationResult = NonNullable<Awaited<ReturnType<typeof listMessages>>>;
export type ListMessagesMutationBody = ListMessagesBody;
export type ListMessagesMutationError = unknown;
/**
* @summary List email messages
*/
export declare const useListMessages: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof listMessages>>, TError, {
        data: ListMessagesBody;
    }, TContext>;
    request?: SecondParameter<typeof customInstance>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof listMessages>>, TError, {
    data: ListMessagesBody;
}, TContext>;
/**
 * @summary Get email message
 */
export declare const getMessage: (getMessageBody: GetMessageBody, options?: SecondParameter<typeof customInstance>, signal?: AbortSignal) => Promise<Message>;
export declare const getGetMessageMutationOptions: <TError = Error, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof getMessage>>, TError, {
        data: GetMessageBody;
    }, TContext>;
    request?: SecondParameter<typeof customInstance>;
}) => UseMutationOptions<Awaited<ReturnType<typeof getMessage>>, TError, {
    data: GetMessageBody;
}, TContext>;
export type GetMessageMutationResult = NonNullable<Awaited<ReturnType<typeof getMessage>>>;
export type GetMessageMutationBody = GetMessageBody;
export type GetMessageMutationError = Error;
/**
* @summary Get email message
*/
export declare const useGetMessage: <TError = Error, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof getMessage>>, TError, {
        data: GetMessageBody;
    }, TContext>;
    request?: SecondParameter<typeof customInstance>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof getMessage>>, TError, {
    data: GetMessageBody;
}, TContext>;
/**
 * @summary Send email message
 */
export declare const sendMessage: (sendRequest: SendRequest, options?: SecondParameter<typeof customInstance>, signal?: AbortSignal) => Promise<SendMessage200>;
export declare const getSendMessageMutationOptions: <TError = Error, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof sendMessage>>, TError, {
        data: SendRequest;
    }, TContext>;
    request?: SecondParameter<typeof customInstance>;
}) => UseMutationOptions<Awaited<ReturnType<typeof sendMessage>>, TError, {
    data: SendRequest;
}, TContext>;
export type SendMessageMutationResult = NonNullable<Awaited<ReturnType<typeof sendMessage>>>;
export type SendMessageMutationBody = SendRequest;
export type SendMessageMutationError = Error;
/**
* @summary Send email message
*/
export declare const useSendMessage: <TError = Error, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof sendMessage>>, TError, {
        data: SendRequest;
    }, TContext>;
    request?: SecondParameter<typeof customInstance>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof sendMessage>>, TError, {
    data: SendRequest;
}, TContext>;
/**
 * @summary Get DMARC reports summary
 */
export declare const getDmarcSummary: (getDmarcSummaryBody: GetDmarcSummaryBody, options?: SecondParameter<typeof customInstance>, signal?: AbortSignal) => Promise<GetDmarcSummary200>;
export declare const getGetDmarcSummaryMutationOptions: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof getDmarcSummary>>, TError, {
        data: GetDmarcSummaryBody;
    }, TContext>;
    request?: SecondParameter<typeof customInstance>;
}) => UseMutationOptions<Awaited<ReturnType<typeof getDmarcSummary>>, TError, {
    data: GetDmarcSummaryBody;
}, TContext>;
export type GetDmarcSummaryMutationResult = NonNullable<Awaited<ReturnType<typeof getDmarcSummary>>>;
export type GetDmarcSummaryMutationBody = GetDmarcSummaryBody;
export type GetDmarcSummaryMutationError = unknown;
/**
* @summary Get DMARC reports summary
*/
export declare const useGetDmarcSummary: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof getDmarcSummary>>, TError, {
        data: GetDmarcSummaryBody;
    }, TContext>;
    request?: SecondParameter<typeof customInstance>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof getDmarcSummary>>, TError, {
    data: GetDmarcSummaryBody;
}, TContext>;
/**
 * @summary List trusted senders
 */
export declare const listTrustedSenders: (params?: ListTrustedSendersParams, options?: SecondParameter<typeof customInstance>, signal?: AbortSignal) => Promise<ListTrustedSenders200>;
export declare const getListTrustedSendersQueryKey: (params?: ListTrustedSendersParams) => readonly ["/policy/trusted-senders", ...ListTrustedSendersParams[]];
export declare const getListTrustedSendersQueryOptions: <TData = Awaited<ReturnType<typeof listTrustedSenders>>, TError = unknown>(params?: ListTrustedSendersParams, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof listTrustedSenders>>, TError, TData>>;
    request?: SecondParameter<typeof customInstance>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listTrustedSenders>>, TError, TData> & {
    queryKey: DataTag<QueryKey, TData>;
};
export type ListTrustedSendersQueryResult = NonNullable<Awaited<ReturnType<typeof listTrustedSenders>>>;
export type ListTrustedSendersQueryError = unknown;
export declare function useListTrustedSenders<TData = Awaited<ReturnType<typeof listTrustedSenders>>, TError = unknown>(params: undefined | ListTrustedSendersParams, options: {
    query: Partial<UseQueryOptions<Awaited<ReturnType<typeof listTrustedSenders>>, TError, TData>> & Pick<DefinedInitialDataOptions<Awaited<ReturnType<typeof listTrustedSenders>>, TError, Awaited<ReturnType<typeof listTrustedSenders>>>, 'initialData'>;
    request?: SecondParameter<typeof customInstance>;
}, queryClient?: QueryClient): DefinedUseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData>;
};
export declare function useListTrustedSenders<TData = Awaited<ReturnType<typeof listTrustedSenders>>, TError = unknown>(params?: ListTrustedSendersParams, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof listTrustedSenders>>, TError, TData>> & Pick<UndefinedInitialDataOptions<Awaited<ReturnType<typeof listTrustedSenders>>, TError, Awaited<ReturnType<typeof listTrustedSenders>>>, 'initialData'>;
    request?: SecondParameter<typeof customInstance>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData>;
};
export declare function useListTrustedSenders<TData = Awaited<ReturnType<typeof listTrustedSenders>>, TError = unknown>(params?: ListTrustedSendersParams, options?: {
    query?: Partial<UseQueryOptions<Awaited<ReturnType<typeof listTrustedSenders>>, TError, TData>>;
    request?: SecondParameter<typeof customInstance>;
}, queryClient?: QueryClient): UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData>;
};
/**
 * @summary Add trusted sender
 */
export declare const addTrustedSender: (addTrustedSenderBody: AddTrustedSenderBody, options?: SecondParameter<typeof customInstance>, signal?: AbortSignal) => Promise<AddTrustedSender201>;
export declare const getAddTrustedSenderMutationOptions: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof addTrustedSender>>, TError, {
        data: AddTrustedSenderBody;
    }, TContext>;
    request?: SecondParameter<typeof customInstance>;
}) => UseMutationOptions<Awaited<ReturnType<typeof addTrustedSender>>, TError, {
    data: AddTrustedSenderBody;
}, TContext>;
export type AddTrustedSenderMutationResult = NonNullable<Awaited<ReturnType<typeof addTrustedSender>>>;
export type AddTrustedSenderMutationBody = AddTrustedSenderBody;
export type AddTrustedSenderMutationError = unknown;
/**
* @summary Add trusted sender
*/
export declare const useAddTrustedSender: <TError = unknown, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof addTrustedSender>>, TError, {
        data: AddTrustedSenderBody;
    }, TContext>;
    request?: SecondParameter<typeof customInstance>;
}, queryClient?: QueryClient) => UseMutationResult<Awaited<ReturnType<typeof addTrustedSender>>, TError, {
    data: AddTrustedSenderBody;
}, TContext>;
export {};
//# sourceMappingURL=api.d.ts.map