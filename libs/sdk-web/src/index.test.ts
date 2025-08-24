import { describe, it, expect } from 'vitest'
import { 
  DOMAIN, 
  HOST, 
  getEmailConfig, 
  validateDomain,
  useLogin,
  useGetCurrentUser,
  User,
  Message,
  SendRequest
} from '../src/index'

describe('@ceerion/sdk-web', () => {
  it('exports domain constants', () => {
    expect(DOMAIN).toBe('ceerion.com')
    expect(HOST).toBe('mail.ceerion.com')
  })

  it('validates domains correctly', () => {
    expect(validateDomain('mail.ceerion.com')).toBe(true)
    expect(validateDomain('subdomain.ceerion.com')).toBe(true)
    expect(validateDomain('evil.com')).toBe(false)
  })

  it('gets email config', () => {
    const config = getEmailConfig()
    expect(config.domain).toBe('ceerion.com')
    expect(config.host).toBe('mail.ceerion.com')
  })

  it('exports React Query hooks', () => {
    expect(typeof useLogin).toBe('function')
    expect(typeof useGetCurrentUser).toBe('function')
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
      sizeEstimate: 1024,
      historyId: '12345',
      internalDate: '2024-01-01T00:00:00Z',
      payload: {
        partId: '',
        mimeType: 'text/plain',
        filename: '',
        headers: [],
        body: {
          size: 1024,
          data: 'dGVzdA=='
        }
      }
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
