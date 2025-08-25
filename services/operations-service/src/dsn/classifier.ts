export interface DSNReport {
  messageId: string;
  recipient: string;
  status: string;
  action: 'failed' | 'delayed' | 'delivered' | 'relayed' | 'expanded';
  diagnosticCode: string;
  lastAttemptDate: Date;
  willRetryUntil?: Date;
  remoteMta?: string;
  reportingMta: string;
}

export interface DSNClassification {
  category: 'permanent' | 'temporary' | 'success';
  subCategory: 'mailbox' | 'system' | 'security' | 'network' | 'protocol' | 'content';
  severity: 'low' | 'medium' | 'high';
  shouldRetry: boolean;
  suppressionTime?: number; // in seconds
}

export function classifyDSN(dsn: DSNReport): DSNClassification {
  const statusCode = dsn.status;
  const [majorClass, minorClass, detail] = statusCode.split('.').map(Number);

  // Permanent failures (5.x.x)
  if (majorClass === 5) {
    return {
      category: 'permanent',
      subCategory: getSubCategory(minorClass),
      severity: getSeverity(minorClass, detail),
      shouldRetry: false,
      suppressionTime: getSuppressionTime(minorClass, detail),
    };
  }

  // Temporary failures (4.x.x)
  if (majorClass === 4) {
    return {
      category: 'temporary',
      subCategory: getSubCategory(minorClass),
      severity: getSeverity(minorClass, detail),
      shouldRetry: true,
      suppressionTime: getRetryDelay(minorClass, detail),
    };
  }

  // Success (2.x.x)
  return {
    category: 'success',
    subCategory: 'system',
    severity: 'low',
    shouldRetry: false,
  };
}

function getSubCategory(minorClass: number): DSNClassification['subCategory'] {
  switch (minorClass) {
    case 1: return 'mailbox';
    case 2: return 'system';
    case 3: return 'network';
    case 4: return 'protocol';
    case 5: return 'protocol';
    case 6: return 'content';
    case 7: return 'security';
    default: return 'system';
  }
}

function getSeverity(minorClass: number, detail: number): DSNClassification['severity'] {
  // High severity for security and permanent mailbox issues
  if (minorClass === 7 || (minorClass === 1 && detail === 1)) {
    return 'high';
  }
  // Medium severity for system and network issues
  if (minorClass === 2 || minorClass === 3) {
    return 'medium';
  }
  return 'low';
}

function getSuppressionTime(minorClass: number, detail: number): number {
  // Permanent suppression times in seconds
  if (minorClass === 1 && detail === 1) return 86400 * 30; // 30 days for mailbox not found
  if (minorClass === 1 && detail === 2) return 86400 * 7;  // 7 days for mailbox full
  if (minorClass === 7) return 86400 * 1; // 1 day for security issues
  return 86400 * 3; // 3 days default
}

function getRetryDelay(minorClass: number, detail: number): number {
  // Temporary retry delays in seconds with exponential backoff
  if (minorClass === 2) return 300;  // 5 minutes for system issues
  if (minorClass === 3) return 900;  // 15 minutes for network issues
  if (minorClass === 4) return 1800; // 30 minutes for protocol issues
  return 600; // 10 minutes default
}

export class RetryManager {
  private retryAttempts = new Map<string, number>();
  private suppressedUntil = new Map<string, Date>();

  shouldRetry(messageId: string, recipient: string, dsn: DSNReport): boolean {
    const key = `${messageId}:${recipient}`;
    const classification = classifyDSN(dsn);

    // Check if suppressed
    const suppressedUntilDate = this.suppressedUntil.get(recipient);
    if (suppressedUntilDate && suppressedUntilDate > new Date()) {
      return false;
    }

    // Check retry attempts
    const attempts = this.retryAttempts.get(key) || 0;
    const maxRetries = classification.category === 'temporary' ? 5 : 0;

    if (!classification.shouldRetry || attempts >= maxRetries) {
      // Add to suppression list if permanent or max retries reached
      if (classification.suppressionTime) {
        this.suppressedUntil.set(
          recipient,
          new Date(Date.now() + classification.suppressionTime * 1000)
        );
      }
      return false;
    }

    return true;
  }

  recordRetry(messageId: string, recipient: string): void {
    const key = `${messageId}:${recipient}`;
    this.retryAttempts.set(key, (this.retryAttempts.get(key) || 0) + 1);
  }

  getNextRetryTime(dsn: DSNReport): Date {
    const classification = classifyDSN(dsn);
    const baseDelay = classification.suppressionTime || 300;
    const attempts = this.retryAttempts.get(`${dsn.messageId}:${dsn.recipient}`) || 0;
    
    // Exponential backoff: delay * 2^attempts (capped at 24 hours)
    const delay = Math.min(baseDelay * Math.pow(2, attempts), 86400);
    return new Date(Date.now() + delay * 1000);
  }

  cleanupOldEntries(): void {
    const now = new Date();
    // Remove old suppression entries
    for (const [key, date] of this.suppressedUntil) {
      if (date < now) {
        this.suppressedUntil.delete(key);
      }
    }
    // Retry attempts cleanup would need additional logic based on message age
  }
}
