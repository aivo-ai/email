import { describe, it, expect } from 'vitest'
import { 
  DOMAIN, 
  HOST, 
  getServerConfig, 
  validateServerDomain,
  CeerionAPIClient,
  User,
  Message,
  SendRequest
} from '../src/index'

describe('@ceerion/sdk-node', () => {
  it('exports domain constants', () => {
    expect(DOMAIN).toBe('ceerion.com')
    expect(HOST).toBe('mail.ceerion.com')
  })

  it('validates domains correctly', () => {
    expect(validateServerDomain('mail.ceerion.com')).toBe(true)
    expect(validateServerDomain('subdomain.ceerion.com')).toBe(true)
    expect(validateServerDomain('evil.com')).toBe(false)
  })

  it('gets server config', () => {
    const config = getServerConfig()
    expect(config.domain).toBe('ceerion.com')
    expect(config.host).toBe('mail.ceerion.com')
    expect(config.apiUrl).toMatch(/localhost|mail\.ceerion\.com/)
  })

  it('creates API client', () => {
    const client = new CeerionAPIClient()
    expect(client).toBeInstanceOf(CeerionAPIClient)
    
    // Test with custom URL
    const customClient = new CeerionAPIClient('https://custom.ceerion.com/api/v1')
    expect(customClient).toBeInstanceOf(CeerionAPIClient)
  })

  it('has proper TypeScript types', () => {
    // Test that types exist and have expected structure
    const user: User = {
      id: 'test-id',
      email: 'test@ceerion.com',
      displayName: 'Test User',
      isActive: true
    }
    expect(user.email).toContain('@ceerion.com')

    const message: Message = {
      id: 'msg-123',
      threadId: 'thread-123',
      labelIds: ['INBOX'],
      snippet: 'Test snippet',
      sizeEstimate: 1024
    }
    expect(message.snippet).toBe('Test snippet')

    const sendRequest: SendRequest = {
      to: [{ email: 'test@ceerion.com' }],
      subject: 'Test',
      textBody: 'Test message'
    }
    expect(sendRequest.subject).toBe('Test')
  })
})
