export interface JMAPRequest {
  using: string[]
  methodCalls: Array<[string, any, string]>
}

export interface JMAPResponse {
  methodResponses: Array<[string, any, string]>
  sessionState: string
}

export class JMAPClient {
  private baseUrl: string
  private accountId: string | null = null

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  async request(methodCalls: Array<[string, any, string]>): Promise<JMAPResponse> {
    const request: JMAPRequest = {
      using: ['urn:ietf:params:jmap:core:1', 'urn:ietf:params:jmap:mail:1'],
      methodCalls
    }

    const response = await fetch(`${this.baseUrl}/jmap`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    })

    if (!response.ok) {
      throw new Error(`JMAP request failed: ${response.statusText}`)
    }

    return await response.json()
  }

  async getMailboxes(): Promise<any[]> {
    const response = await this.request([
      ['Mailbox/get', {}, 'get-mailboxes']
    ])

    return response.methodResponses[0][1]?.list || []
  }

  async getEmails(mailboxId: string): Promise<any[]> {
    const response = await this.request([
      ['Email/query', { filter: { inMailbox: mailboxId } }, 'query-emails']
    ])

    return response.methodResponses[0][1]?.ids || []
  }
}
