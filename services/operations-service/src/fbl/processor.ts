export interface FBLReport {
  feedbackType: 'abuse' | 'fraud' | 'virus' | 'other';
  userAgent: string;
  version: string;
  originalRecipient: string;
  arrivalDate: Date;
  sourceIp: string;
  authenticationResults?: string;
  originalMessage: string;
  reportingMta: string;
}

export async function parseFBLReport(rawMessage: string): Promise<FBLReport> {
  const lines = rawMessage.split('\n');
  let isInHeaders = true;
  let isInReport = false;
  let isInOriginalMessage = false;
  
  const headers: Record<string, string> = {};
  let reportContent = '';
  let originalMessage = '';
  
  for (const line of lines) {
    if (isInHeaders && line.trim() === '') {
      isInHeaders = false;
      isInReport = true;
      continue;
    }
    
    if (isInHeaders) {
      const [key, ...valueParts] = line.split(':');
      if (key && valueParts.length > 0) {
        headers[key.toLowerCase().trim()] = valueParts.join(':').trim();
      }
    } else if (isInReport) {
      if (line.includes('Content-Type: message/rfc822')) {
        isInReport = false;
        isInOriginalMessage = true;
        continue;
      }
      reportContent += line + '\n';
    } else if (isInOriginalMessage) {
      originalMessage += line + '\n';
    }
  }
  
  // Parse the feedback report headers
  const feedbackType = extractValue(reportContent, 'Feedback-Type') as FBLReport['feedbackType'] || 'other';
  const userAgent = extractValue(reportContent, 'User-Agent') || '';
  const version = extractValue(reportContent, 'Version') || '1';
  const originalRecipient = extractValue(reportContent, 'Original-Rcpt-To') || '';
  const arrivalDate = new Date(extractValue(reportContent, 'Arrival-Date') || Date.now());
  const sourceIp = extractValue(reportContent, 'Source-IP') || '';
  const authenticationResults = extractValue(reportContent, 'Authentication-Results');
  const reportingMta = extractValue(reportContent, 'Reporting-MTA') || '';
  
  return {
    feedbackType,
    userAgent,
    version,
    originalRecipient,
    arrivalDate,
    sourceIp,
    authenticationResults,
    originalMessage: originalMessage.trim(),
    reportingMta,
  };
}

function extractValue(content: string, field: string): string | undefined {
  const regex = new RegExp(`${field}:\\s*(.+)`, 'i');
  const match = content.match(regex);
  return match ? match[1].trim() : undefined;
}

export class FBLProcessor {
  async processFBLReport(report: FBLReport): Promise<void> {
    // Extract the original message details
    const messageId = this.extractMessageId(report.originalMessage);
    const recipient = report.originalRecipient;
    
    // Log the complaint
    console.log(`FBL complaint received: ${report.feedbackType} for ${recipient}`);
    
    // Add to suppression list immediately
    await this.addToSuppressionList(recipient, report.feedbackType);
    
    // Update reputation metrics
    await this.updateReputationMetrics(report.sourceIp, report.feedbackType);
    
    // Alert administrators for high-severity complaints
    if (report.feedbackType === 'abuse' || report.feedbackType === 'fraud') {
      await this.alertAdministrators(report);
    }
  }
  
  private extractMessageId(originalMessage: string): string | undefined {
    const messageIdMatch = originalMessage.match(/Message-ID:\s*<(.+)>/i);
    return messageIdMatch ? messageIdMatch[1] : undefined;
  }
  
  private async addToSuppressionList(email: string, reason: string): Promise<void> {
    // Add email to suppression list
    // Implementation would connect to database
    console.log(`Adding ${email} to suppression list: ${reason}`);
  }
  
  private async updateReputationMetrics(sourceIp: string, feedbackType: string): Promise<void> {
    // Update IP reputation based on complaint type
    console.log(`Updating reputation for ${sourceIp}: ${feedbackType} complaint`);
  }
  
  private async alertAdministrators(report: FBLReport): Promise<void> {
    // Send alert to administrators for serious complaints
    console.log(`ALERT: Serious complaint received - ${report.feedbackType}`);
  }
}
