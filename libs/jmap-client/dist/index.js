import WebSocket from 'ws';
/**
 * JMAP client with exponential backoff retry logic
 */
export class JMAPClientImpl {
    constructor(options) {
        this.wsConnection = null;
        this.baseUrl = options.baseUrl.replace(/\/$/, ''); // Remove trailing slash
        this.maxRetries = options.maxRetries ?? 3;
        this.initialRetryDelay = options.initialRetryDelay ?? 1000;
        this.maxRetryDelay = options.maxRetryDelay ?? 10000;
    }
    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    calculateRetryDelay(attempt) {
        const delay = this.initialRetryDelay * Math.pow(2, attempt);
        return Math.min(delay, this.maxRetryDelay);
    }
    async fetchWithRetry(url, options = {}) {
        let lastError = null;
        for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
            try {
                const response = await fetch(url, {
                    ...options,
                    headers: {
                        'Content-Type': 'application/json',
                        ...options.headers
                    }
                });
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                return await response.json();
            }
            catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                // Don't retry on 4xx errors (client errors)
                if (error instanceof Error && error.message.includes('HTTP 4')) {
                    throw lastError;
                }
                if (attempt < this.maxRetries) {
                    const delay = this.calculateRetryDelay(attempt);
                    console.warn(`Request failed (attempt ${attempt + 1}/${this.maxRetries + 1}): ${lastError.message}. Retrying in ${delay}ms...`);
                    await this.sleep(delay);
                }
            }
        }
        throw lastError || new Error('Request failed after all retry attempts');
    }
    async listMessages(options = {}) {
        const searchParams = new URLSearchParams();
        if (options.limit)
            searchParams.set('limit', options.limit.toString());
        if (options.offset)
            searchParams.set('offset', options.offset.toString());
        if (options.threadId)
            searchParams.set('threadId', options.threadId);
        if (options.hasAttachment !== undefined)
            searchParams.set('hasAttachment', options.hasAttachment.toString());
        if (options.isUnread !== undefined)
            searchParams.set('isUnread', options.isUnread.toString());
        if (options.labels?.length)
            searchParams.set('labels', options.labels.join(','));
        const url = `${this.baseUrl}/messages?${searchParams.toString()}`;
        const response = await this.fetchWithRetry(url);
        return response.messages;
    }
    async getMessage(id) {
        try {
            const url = `${this.baseUrl}/messages/${encodeURIComponent(id)}`;
            return await this.fetchWithRetry(url);
        }
        catch (error) {
            if (error instanceof Error && error.message.includes('HTTP 404')) {
                return null;
            }
            throw error;
        }
    }
    async sendMessage(message) {
        const url = `${this.baseUrl}/send`;
        // Convert File objects to base64 for JSON transport
        const messageData = {
            ...message,
            attachments: message.attachments ? await Promise.all(message.attachments.map(async (file) => ({
                filename: file.name,
                mimeType: file.type,
                size: file.size,
                data: await this.fileToBase64(file)
            }))) : undefined
        };
        return await this.fetchWithRetry(url, {
            method: 'POST',
            body: JSON.stringify(messageData)
        });
    }
    async fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                if (typeof reader.result === 'string') {
                    // Remove data URL prefix to get just the base64 content
                    const base64 = reader.result.split(',')[1];
                    resolve(base64);
                }
                else {
                    reject(new Error('Failed to read file as base64'));
                }
            };
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
        });
    }
    async connectPush(onMessage) {
        return new Promise((resolve, reject) => {
            const wsUrl = this.baseUrl.replace(/^http/, 'ws') + '/ws';
            try {
                this.wsConnection = new WebSocket(wsUrl);
                this.wsConnection.onopen = () => {
                    console.log('JMAP WebSocket connected');
                    // Return disconnect function
                    resolve(() => {
                        if (this.wsConnection) {
                            this.wsConnection.close();
                            this.wsConnection = null;
                        }
                    });
                };
                this.wsConnection.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data.toString());
                        if (data.type === 'newMail' && data.message) {
                            onMessage(data.message);
                        }
                    }
                    catch (error) {
                        console.error('Failed to parse WebSocket message:', error);
                    }
                };
                this.wsConnection.onerror = (error) => {
                    console.error('JMAP WebSocket error:', error);
                    reject(new Error('WebSocket connection failed'));
                };
                this.wsConnection.onclose = (event) => {
                    console.log('JMAP WebSocket disconnected:', event.code, event.reason);
                    this.wsConnection = null;
                    // Attempt to reconnect with exponential backoff
                    if (!event.wasClean) {
                        setTimeout(() => {
                            this.reconnectWebSocket(onMessage);
                        }, this.initialRetryDelay);
                    }
                };
            }
            catch (error) {
                reject(error);
            }
        });
    }
    async reconnectWebSocket(onMessage) {
        let attempt = 0;
        while (attempt <= this.maxRetries) {
            try {
                console.log(`Attempting WebSocket reconnection (${attempt + 1}/${this.maxRetries + 1})...`);
                await this.connectPush(onMessage);
                console.log('WebSocket reconnected successfully');
                return;
            }
            catch (error) {
                attempt++;
                if (attempt <= this.maxRetries) {
                    const delay = this.calculateRetryDelay(attempt);
                    console.warn(`Reconnection failed, retrying in ${delay}ms...`);
                    await this.sleep(delay);
                }
            }
        }
        console.error('Failed to reconnect WebSocket after all attempts');
    }
}
/**
 * Create a JMAP client instance
 */
export function createJMAPClient(options) {
    return new JMAPClientImpl(options);
}
export default {
    createJMAPClient,
    JMAPClientImpl
};
//# sourceMappingURL=index.js.map