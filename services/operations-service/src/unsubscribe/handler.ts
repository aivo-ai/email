import { createSign, createVerify } from 'crypto';

export interface UnsubscribeRequest {
  listId: string;
  email: string;
  messageId: string;
  timestamp: number;
  signature?: string;
}

export class ListUnsubscribeHandler {
  private privateKey: string;
  private domain: string;

  constructor(privateKey: string, domain: string) {
    this.privateKey = privateKey;
    this.domain = domain;
  }

  generateUnsubscribeHeaders(email: string, listId: string, messageId: string): {
    'List-Unsubscribe': string;
    'List-Unsubscribe-Post': string;
  } {
    const timestamp = Math.floor(Date.now() / 1000);
    const token = this.generateSecureToken(email, listId, messageId, timestamp);
    
    const unsubscribeUrl = `https://${this.domain}/unsubscribe?token=${token}`;
    const postData = `List-Unsubscribe=One-Click`;

    return {
      'List-Unsubscribe': `<${unsubscribeUrl}>, <mailto:unsubscribe-${listId}@${this.domain}>`,
      'List-Unsubscribe-Post': postData,
    };
  }

  private generateSecureToken(email: string, listId: string, messageId: string, timestamp: number): string {
    const data = `${email}:${listId}:${messageId}:${timestamp}`;
    const signer = createSign('sha256');
    signer.update(data);
    const signature = signer.sign(this.privateKey, 'base64url');
    
    // Combine data and signature
    const token = Buffer.from(`${data}:${signature}`).toString('base64url');
    return token;
  }

  async processUnsubscribeRequest(token: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Decode and verify the token
      const decoded = Buffer.from(token, 'base64url').toString('utf-8');
      const parts = decoded.split(':');
      
      if (parts.length !== 5) {
        return { success: false, error: 'Invalid token format' };
      }

      const [email, listId, messageId, timestampStr, signature] = parts;
      const timestamp = parseInt(timestampStr);

      // Check if token is not too old (24 hours)
      if (Date.now() / 1000 - timestamp > 86400) {
        return { success: false, error: 'Token expired' };
      }

      // Verify signature
      const data = `${email}:${listId}:${messageId}:${timestamp}`;
      const verifier = createVerify('sha256');
      verifier.update(data);
      const isValid = verifier.verify(this.privateKey, signature, 'base64url');

      if (!isValid) {
        return { success: false, error: 'Invalid signature' };
      }

      // Process the unsubscribe
      await this.unsubscribeEmail(email, listId);
      
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Failed to process unsubscribe request' };
    }
  }

  async processOneClickUnsubscribe(
    listUnsubscribeHeader: string,
    userAgent: string,
    sourceIp: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Validate that this is a legitimate one-click unsubscribe
      if (!this.validateOneClickRequest(userAgent, sourceIp)) {
        return { success: false, error: 'Invalid one-click request' };
      }

      // Extract token from List-Unsubscribe header
      const urlMatch = listUnsubscribeHeader.match(/https:\/\/[^>]+/);
      if (!urlMatch) {
        return { success: false, error: 'No unsubscribe URL found' };
      }

      const url = new URL(urlMatch[0]);
      const token = url.searchParams.get('token');
      
      if (!token) {
        return { success: false, error: 'No token found' };
      }

      return await this.processUnsubscribeRequest(token);
    } catch (error) {
      return { success: false, error: 'Failed to process one-click unsubscribe' };
    }
  }

  private validateOneClickRequest(userAgent: string, sourceIp: string): boolean {
    // Validate that the request comes from legitimate email providers
    const validUserAgents = [
      /Gmail/i,
      /Yahoo/i,
      /Outlook/i,
      /Apple Mail/i,
      /Thunderbird/i,
    ];

    return validUserAgents.some(pattern => pattern.test(userAgent));
  }

  private async unsubscribeEmail(email: string, listId: string): Promise<void> {
    // Add email to unsubscribe list for the specific list
    console.log(`Unsubscribing ${email} from list ${listId}`);
    
    // Implementation would:
    // 1. Add to suppression list in database
    // 2. Update email preferences
    // 3. Log the unsubscribe event
    // 4. Send confirmation email (optional)
  }

  async generateUnsubscribeConfirmation(email: string, listId: string): Promise<string> {
    return `
      <html>
        <head><title>Unsubscribe Confirmation</title></head>
        <body>
          <h2>Unsubscribe Successful</h2>
          <p>You have been successfully unsubscribed from list: ${listId}</p>
          <p>Email: ${email}</p>
          <p>If this was done in error, you can resubscribe by contacting us.</p>
        </body>
      </html>
    `;
  }
}
