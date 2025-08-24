import WebSocket from 'ws'

export interface JMAPClient {
  listMessages(options?: ListMessagesOptions): Promise<Message[]>
  getMessage(id: string): Promise<Message | null>
  sendMessage(message: SendMessageRequest): Promise<{ id: string }>
  connectPush(onMessage: (message: Message) => void): Promise<() => void>
}

export interface ListMessagesOptions {
  limit?: number
  offset?: number
  threadId?: string
  hasAttachment?: boolean
  isUnread?: boolean
  labels?: string[]
}

export interface Message {
  id: string
  threadId: string
  subject: string
  snippet: string
  from: EmailAddress[]
  to: EmailAddress[]
  cc?: EmailAddress[]
  bcc?: EmailAddress[]
  receivedAt: string
  isUnread: boolean
  labelIds: string[]
  sizeEstimate: number
  bodyText?: string
  bodyHtml?: string
  attachments?: Attachment[]
}

export interface EmailAddress {
  name?: string
  email: string
}

export interface Attachment {
  id: string
  filename: string
  mimeType: string
  size: number
  inline: boolean
}

export interface SendMessageRequest {
  to: EmailAddress[]
  cc?: EmailAddress[]
  bcc?: EmailAddress[]
  subject: string
  bodyText?: string
  bodyHtml?: string
  attachments?: File[]
}

export interface JMAPClientOptions {
  baseUrl: string
  maxRetries?: number
  initialRetryDelay?: number
  maxRetryDelay?: number
}

/**
 * JMAP client with exponential backoff retry logic
 */
export class JMAPClientImpl implements JMAPClient {
  private baseUrl: string
  private maxRetries: number
  private initialRetryDelay: number
  private maxRetryDelay: number
  private wsConnection: WebSocket | null = null

  constructor(options: JMAPClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '') // Remove trailing slash
    this.maxRetries = options.maxRetries ?? 3
    this.initialRetryDelay = options.initialRetryDelay ?? 1000
    this.maxRetryDelay = options.maxRetryDelay ?? 10000
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private calculateRetryDelay(attempt: number): number {
    const delay = this.initialRetryDelay * Math.pow(2, attempt)
    return Math.min(delay, this.maxRetryDelay)
  }

  private async fetchWithRetry<T>(
    url: string, 
    options: RequestInit = {}
  ): Promise<T> {
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            ...options.headers
          }
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        return await response.json()
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        
        // Don't retry on 4xx errors (client errors)
        if (error instanceof Error && error.message.includes('HTTP 4')) {
          throw lastError
        }

        if (attempt < this.maxRetries) {
          const delay = this.calculateRetryDelay(attempt)
          console.warn(`Request failed (attempt ${attempt + 1}/${this.maxRetries + 1}): ${lastError.message}. Retrying in ${delay}ms...`)
          await this.sleep(delay)
        }
      }
    }

    throw lastError || new Error('Request failed after all retry attempts')
  }

  async listMessages(options: ListMessagesOptions = {}): Promise<Message[]> {
    const searchParams = new URLSearchParams()
    
    if (options.limit) searchParams.set('limit', options.limit.toString())
    if (options.offset) searchParams.set('offset', options.offset.toString())
    if (options.threadId) searchParams.set('threadId', options.threadId)
    if (options.hasAttachment !== undefined) searchParams.set('hasAttachment', options.hasAttachment.toString())
    if (options.isUnread !== undefined) searchParams.set('isUnread', options.isUnread.toString())
    if (options.labels?.length) searchParams.set('labels', options.labels.join(','))

    const url = `${this.baseUrl}/messages?${searchParams.toString()}`
    const response = await this.fetchWithRetry<{ messages: Message[] }>(url)
    
    return response.messages
  }

  async getMessage(id: string): Promise<Message | null> {
    try {
      const url = `${this.baseUrl}/messages/${encodeURIComponent(id)}`
      return await this.fetchWithRetry<Message>(url)
    } catch (error) {
      if (error instanceof Error && error.message.includes('HTTP 404')) {
        return null
      }
      throw error
    }
  }

  async sendMessage(message: SendMessageRequest): Promise<{ id: string }> {
    const url = `${this.baseUrl}/send`
    
    // Convert File objects to base64 for JSON transport
    const messageData = {
      ...message,
      attachments: message.attachments ? await Promise.all(
        message.attachments.map(async (file) => ({
          filename: file.name,
          mimeType: file.type,
          size: file.size,
          data: await this.fileToBase64(file)
        }))
      ) : undefined
    }

    return await this.fetchWithRetry<{ id: string }>(url, {
      method: 'POST',
      body: JSON.stringify(messageData)
    })
  }

  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          // Remove data URL prefix to get just the base64 content
          const base64 = reader.result.split(',')[1]
          resolve(base64)
        } else {
          reject(new Error('Failed to read file as base64'))
        }
      }
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(file)
    })
  }

  async connectPush(onMessage: (message: Message) => void): Promise<() => void> {
    return new Promise((resolve, reject) => {
      const wsUrl = this.baseUrl.replace(/^http/, 'ws') + '/ws'
      
      try {
        this.wsConnection = new WebSocket(wsUrl)
        
        this.wsConnection.onopen = () => {
          console.log('JMAP WebSocket connected')
          
          // Return disconnect function
          resolve(() => {
            if (this.wsConnection) {
              this.wsConnection.close()
              this.wsConnection = null
            }
          })
        }
        
        this.wsConnection.onmessage = (event: any) => {
          try {
            const data = JSON.parse(event.data.toString())
            if (data.type === 'newMail' && data.message) {
              onMessage(data.message)
            }
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error)
          }
        }
        
        this.wsConnection.onerror = (error: any) => {
          console.error('JMAP WebSocket error:', error)
          reject(new Error('WebSocket connection failed'))
        }
        
        this.wsConnection.onclose = (event: any) => {
          console.log('JMAP WebSocket disconnected:', event.code, event.reason)
          this.wsConnection = null
          
          // Attempt to reconnect with exponential backoff
          if (!event.wasClean) {
            setTimeout(() => {
              this.reconnectWebSocket(onMessage)
            }, this.initialRetryDelay)
          }
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  private async reconnectWebSocket(onMessage: (message: Message) => void): Promise<void> {
    let attempt = 0
    
    while (attempt <= this.maxRetries) {
      try {
        console.log(`Attempting WebSocket reconnection (${attempt + 1}/${this.maxRetries + 1})...`)
        await this.connectPush(onMessage)
        console.log('WebSocket reconnected successfully')
        return
      } catch (error) {
        attempt++
        if (attempt <= this.maxRetries) {
          const delay = this.calculateRetryDelay(attempt)
          console.warn(`Reconnection failed, retrying in ${delay}ms...`)
          await this.sleep(delay)
        }
      }
    }
    
    console.error('Failed to reconnect WebSocket after all attempts')
  }
}

/**
 * Create a JMAP client instance
 */
export function createJMAPClient(options: JMAPClientOptions): JMAPClient {
  return new JMAPClientImpl(options)
}

// Legacy JMAP interfaces for backward compatibility
export interface JMAPRequest {
  using: string[]
  methodCalls: Array<[string, any, string]>
}

export interface JMAPResponse {
  methodResponses: Array<[string, any, string]>
  sessionState: string
}

export default {
  createJMAPClient,
  JMAPClientImpl
}
