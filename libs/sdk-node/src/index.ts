import fetch from 'node-fetch'
import type { paths, components } from './types.js'

export const DOMAIN = 'ceerion.com'
export const HOST = 'mail.ceerion.com'

export interface EmailServerConfig {
  domain: string
  host: string
  port?: number
  ssl?: boolean
  apiUrl: string
}

export const getServerConfig = (): EmailServerConfig => ({
  domain: DOMAIN,
  host: HOST,
  port: 3000,
  ssl: true,
  apiUrl: process.env.NODE_ENV === 'production' 
    ? 'https://mail.ceerion.com/api/v1'
    : 'http://localhost:3000/api/v1'
})

export const validateServerDomain = (hostname: string): boolean => {
  return hostname === HOST || hostname.endsWith(`.${DOMAIN}`)
}

// Export generated types
export type User = components['schemas']['User']
export type Message = components['schemas']['Message']
export type SendRequest = components['schemas']['SendRequest']
export type Label = components['schemas']['Label']
export type Error = components['schemas']['Error']

type LoginRequest = paths['/auth/login']['post']['requestBody']['content']['application/json']
type LoginResponse = paths['/auth/login']['post']['responses']['200']['content']['application/json']

export class CeerionAPIClient {
  private apiUrl: string
  private accessToken?: string

  constructor(apiUrl?: string) {
    this.apiUrl = apiUrl || getServerConfig().apiUrl
  }

  setAccessToken(token: string) {
    this.accessToken = token
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.apiUrl}${endpoint}`
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {})
    }

    if (this.accessToken) {
      headers.Authorization = `Bearer ${this.accessToken}`
    }

    const response = await fetch(url, {
      ...options,
      headers
    } as any)

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`)
    }

    return response.json() as Promise<T>
  }

  async login(email: string, password: string): Promise<LoginResponse> {
    return this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password } as LoginRequest)
    })
  }

  async getCurrentUser(): Promise<User> {
    return this.request<User>('/users/me')
  }

  async listMessages(params: paths['/mail/messages:list']['post']['requestBody']['content']['application/json'] = {}) {
    return this.request<paths['/mail/messages:list']['post']['responses']['200']['content']['application/json']>('/mail/messages:list', {
      method: 'POST',
      body: JSON.stringify(params)
    })
  }

  async getMessage(id: string, format: 'metadata' | 'minimal' | 'full' = 'full') {
    return this.request<Message>('/mail/messages:get', {
      method: 'POST',
      body: JSON.stringify({ id, format })
    })
  }

  async sendMessage(sendRequest: SendRequest) {
    return this.request<paths['/mail/send']['post']['responses']['200']['content']['application/json']>('/mail/send', {
      method: 'POST',
      body: JSON.stringify(sendRequest)
    })
  }
}
