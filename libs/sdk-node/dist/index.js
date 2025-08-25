import fetch from 'node-fetch';
export const DOMAIN = 'ceerion.com';
export const HOST = 'mail.ceerion.com';
export const getServerConfig = () => ({
    domain: DOMAIN,
    host: HOST,
    port: 3000,
    ssl: true,
    apiUrl: process.env.NODE_ENV === 'production'
        ? 'https://mail.ceerion.com/api/v1'
        : 'http://localhost:3000/api/v1'
});
export const validateServerDomain = (hostname) => {
    return hostname === HOST || hostname.endsWith(`.${DOMAIN}`);
};
export class CeerionAPIClient {
    constructor(apiUrl) {
        this.apiUrl = apiUrl || getServerConfig().apiUrl;
    }
    setAccessToken(token) {
        this.accessToken = token;
    }
    async request(endpoint, options = {}) {
        const url = `${this.apiUrl}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        };
        if (this.accessToken) {
            headers.Authorization = `Bearer ${this.accessToken}`;
        }
        const response = await fetch(url, {
            ...options,
            headers
        });
        if (!response.ok) {
            throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }
        return response.json();
    }
    async login(email, password) {
        return this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
    }
    async getCurrentUser() {
        return this.request('/users/me');
    }
    async listMessages(params = {}) {
        return this.request('/mail/messages:list', {
            method: 'POST',
            body: JSON.stringify(params)
        });
    }
    async getMessage(id, format = 'full') {
        return this.request('/mail/messages:get', {
            method: 'POST',
            body: JSON.stringify({ id, format })
        });
    }
    async sendMessage(sendRequest) {
        return this.request('/mail/send', {
            method: 'POST',
            body: JSON.stringify(sendRequest)
        });
    }
}
//# sourceMappingURL=index.js.map