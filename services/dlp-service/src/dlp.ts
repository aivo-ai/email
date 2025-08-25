import { createHash } from 'crypto';
import winston from 'winston';

export interface DLPRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'pii' | 'pci' | 'phi' | 'financial' | 'intellectual-property' | 'custom';
  patterns: Array<{
    type: 'regex' | 'keyword' | 'dictionary' | 'ml-model';
    value: string;
    confidence?: number;
    context?: string[];
  }>;
  actions: Array<{
    type: 'block' | 'quarantine' | 'encrypt' | 'warn' | 'log' | 'redact';
    parameters?: Record<string, any>;
  }>;
  exceptions: Array<{
    type: 'sender' | 'recipient' | 'domain' | 'subject';
    value: string;
  }>;
}

export interface DLPMatch {
  ruleId: string;
  ruleName: string;
  category: string;
  severity: string;
  matchedText: string;
  redactedText: string;
  confidence: number;
  location: {
    type: 'subject' | 'body' | 'attachment';
    attachmentName?: string;
    lineNumber?: number;
    charOffset?: number;
  };
  context: string;
}

export interface ScanResult {
  id: string;
  timestamp: Date;
  messageId: string;
  matches: DLPMatch[];
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  actions: Array<{
    type: string;
    applied: boolean;
    reason?: string;
  }>;
  processingTime: number;
}

export class DLPService {
  private rules: Map<string, DLPRule> = new Map();
  private logger: winston.Logger;

  constructor() {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'dlp.log' }),
      ],
    });

    this.initializeDefaultRules();
  }

  private initializeDefaultRules() {
    // Social Security Numbers
    this.addRule({
      id: 'ssn',
      name: 'Social Security Numbers',
      description: 'Detects US Social Security Numbers',
      enabled: true,
      severity: 'high',
      category: 'pii',
      patterns: [
        {
          type: 'regex',
          value: '\\b(?!000|666|9\\d{2})\\d{3}[-.]?(?!00)\\d{2}[-.]?(?!0000)\\d{4}\\b',
          confidence: 0.9,
          context: ['social', 'ssn', 'security'],
        },
      ],
      actions: [
        { type: 'block' },
        { type: 'log' },
      ],
      exceptions: [],
    });

    // Credit Card Numbers
    this.addRule({
      id: 'credit-card',
      name: 'Credit Card Numbers',
      description: 'Detects credit card numbers (Visa, MasterCard, etc.)',
      enabled: true,
      severity: 'critical',
      category: 'pci',
      patterns: [
        {
          type: 'regex',
          value: '\\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3[0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\\b',
          confidence: 0.95,
          context: ['card', 'credit', 'payment'],
        },
      ],
      actions: [
        { type: 'block' },
        { type: 'quarantine' },
        { type: 'log' },
      ],
      exceptions: [],
    });

    // Medical Record Numbers
    this.addRule({
      id: 'medical-record',
      name: 'Medical Record Numbers',
      description: 'Detects medical record numbers and health information',
      enabled: true,
      severity: 'high',
      category: 'phi',
      patterns: [
        {
          type: 'regex',
          value: '\\b(?:MRN|MR|Medical Record|Patient ID)\\s*[:#]?\\s*([A-Z0-9]{6,15})\\b',
          confidence: 0.85,
          context: ['medical', 'patient', 'health', 'diagnosis'],
        },
      ],
      actions: [
        { type: 'encrypt' },
        { type: 'log' },
      ],
      exceptions: [],
    });

    // Bank Account Numbers
    this.addRule({
      id: 'bank-account',
      name: 'Bank Account Numbers',
      description: 'Detects bank account numbers',
      enabled: true,
      severity: 'high',
      category: 'financial',
      patterns: [
        {
          type: 'regex',
          value: '\\b(?:Account|Acct)\\s*[:#]?\\s*([0-9]{8,17})\\b',
          confidence: 0.8,
          context: ['bank', 'account', 'routing', 'financial'],
        },
      ],
      actions: [
        { type: 'block' },
        { type: 'log' },
      ],
      exceptions: [],
    });

    // Email Addresses (for privacy)
    this.addRule({
      id: 'email-addresses',
      name: 'Email Addresses',
      description: 'Detects email addresses in content',
      enabled: true,
      severity: 'medium',
      category: 'pii',
      patterns: [
        {
          type: 'regex',
          value: '\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b',
          confidence: 0.9,
        },
      ],
      actions: [
        { type: 'warn' },
        { type: 'log' },
      ],
      exceptions: [
        { type: 'domain', value: 'company.com' },
        { type: 'domain', value: 'internal.company.com' },
      ],
    });

    // IP Addresses
    this.addRule({
      id: 'ip-addresses',
      name: 'IP Addresses',
      description: 'Detects IP addresses that might be sensitive',
      enabled: true,
      severity: 'low',
      category: 'intellectual-property',
      patterns: [
        {
          type: 'regex',
          value: '\\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\b',
          confidence: 0.7,
          context: ['server', 'internal', 'private', 'infrastructure'],
        },
      ],
      actions: [
        { type: 'warn' },
        { type: 'log' },
      ],
      exceptions: [
        { type: 'sender', value: 'it-team@company.com' },
      ],
    });

    // API Keys and Tokens
    this.addRule({
      id: 'api-keys',
      name: 'API Keys and Tokens',
      description: 'Detects API keys, tokens, and credentials',
      enabled: true,
      severity: 'critical',
      category: 'intellectual-property',
      patterns: [
        {
          type: 'regex',
          value: '(?i)(?:api[_-]?key|token|secret|password)\\s*[=:]\\s*["\']?([a-z0-9]{20,})["\']?',
          confidence: 0.9,
          context: ['api', 'authentication', 'credentials'],
        },
        {
          type: 'regex',
          value: '\\bAKIA[0-9A-Z]{16}\\b', // AWS Access Key
          confidence: 0.95,
        },
        {
          type: 'regex',
          value: '\\bghp_[0-9a-zA-Z]{36}\\b', // GitHub Token
          confidence: 0.95,
        },
      ],
      actions: [
        { type: 'block' },
        { type: 'quarantine' },
        { type: 'log' },
      ],
      exceptions: [],
    });
  }

  addRule(rule: DLPRule): void {
    this.rules.set(rule.id, rule);
    this.logger.info('DLP rule added', { ruleId: rule.id, name: rule.name });
  }

  removeRule(ruleId: string): void {
    this.rules.delete(ruleId);
    this.logger.info('DLP rule removed', { ruleId });
  }

  async scanMessage(
    messageId: string,
    content: {
      subject?: string;
      body?: string;
      attachments?: Array<{
        name: string;
        content: string;
        mimeType: string;
      }>;
    },
    metadata: {
      sender?: string;
      recipients?: string[];
      timestamp?: Date;
    } = {}
  ): Promise<ScanResult> {
    const startTime = Date.now();
    const scanId = createHash('md5').update(messageId + startTime).digest('hex');
    
    this.logger.info('Starting DLP scan', { scanId, messageId });

    const matches: DLPMatch[] = [];

    // Scan subject
    if (content.subject) {
      const subjectMatches = await this.scanText(
        content.subject,
        'subject',
        metadata
      );
      matches.push(...subjectMatches);
    }

    // Scan body
    if (content.body) {
      const bodyMatches = await this.scanText(
        content.body,
        'body',
        metadata
      );
      matches.push(...bodyMatches);
    }

    // Scan attachments
    if (content.attachments) {
      for (const attachment of content.attachments) {
        const attachmentMatches = await this.scanAttachment(
          attachment,
          metadata
        );
        matches.push(...attachmentMatches);
      }
    }

    // Determine overall risk
    const overallRisk = this.calculateOverallRisk(matches);

    // Apply actions
    const actions = await this.applyActions(matches, metadata);

    const processingTime = Date.now() - startTime;

    const result: ScanResult = {
      id: scanId,
      timestamp: new Date(),
      messageId,
      matches,
      overallRisk,
      actions,
      processingTime,
    };

    this.logger.info('DLP scan completed', {
      scanId,
      messageId,
      matchCount: matches.length,
      overallRisk,
      processingTime,
    });

    return result;
  }

  private async scanText(
    text: string,
    locationType: 'subject' | 'body',
    metadata: any
  ): Promise<DLPMatch[]> {
    const matches: DLPMatch[] = [];

    for (const [ruleId, rule] of this.rules) {
      if (!rule.enabled) continue;

      // Check exceptions
      if (this.isExempt(rule, metadata)) continue;

      for (const pattern of rule.patterns) {
        const patternMatches = this.findPatternMatches(
          text,
          pattern,
          rule,
          { type: locationType }
        );
        matches.push(...patternMatches);
      }
    }

    return matches;
  }

  private async scanAttachment(
    attachment: { name: string; content: string; mimeType: string },
    metadata: any
  ): Promise<DLPMatch[]> {
    const matches: DLPMatch[] = [];

    // Extract text content based on MIME type
    let textContent = '';
    
    try {
      if (attachment.mimeType.startsWith('text/')) {
        textContent = attachment.content;
      } else if (attachment.mimeType === 'application/pdf') {
        // In production, use pdf-parse library
        textContent = `[PDF content extraction would happen here for ${attachment.name}]`;
      } else if (attachment.mimeType.includes('wordprocessingml') || 
                 attachment.mimeType.includes('msword')) {
        // In production, use mammoth library for Word docs
        textContent = `[Word document content extraction would happen here for ${attachment.name}]`;
      } else if (attachment.mimeType.includes('spreadsheetml') || 
                 attachment.mimeType.includes('excel')) {
        // In production, use xlsx library
        textContent = `[Excel content extraction would happen here for ${attachment.name}]`;
      }

      if (textContent) {
        for (const [ruleId, rule] of this.rules) {
          if (!rule.enabled) continue;
          if (this.isExempt(rule, metadata)) continue;

          for (const pattern of rule.patterns) {
            const patternMatches = this.findPatternMatches(
              textContent,
              pattern,
              rule,
              { type: 'attachment', attachmentName: attachment.name }
            );
            matches.push(...patternMatches);
          }
        }
      }
    } catch (error) {
      this.logger.warn('Failed to scan attachment', {
        attachmentName: attachment.name,
        error: error instanceof Error ? error.message : error,
      });
    }

    return matches;
  }

  private findPatternMatches(
    text: string,
    pattern: any,
    rule: DLPRule,
    location: any
  ): DLPMatch[] {
    const matches: DLPMatch[] = [];

    if (pattern.type === 'regex') {
      const regex = new RegExp(pattern.value, 'gi');
      let match;

      while ((match = regex.exec(text)) !== null) {
        // Check context if specified
        if (pattern.context && pattern.context.length > 0) {
          const surroundingText = this.getSurroundingText(text, match.index, 100);
          const hasContext = pattern.context.some((ctx: string) =>
            surroundingText.toLowerCase().includes(ctx.toLowerCase())
          );
          
          if (!hasContext) continue;
        }

        const matchedText = match[0];
        const redactedText = this.redactText(matchedText, rule.category);
        const confidence = pattern.confidence || 0.8;

        matches.push({
          ruleId: rule.id,
          ruleName: rule.name,
          category: rule.category,
          severity: rule.severity,
          matchedText,
          redactedText,
          confidence,
          location: {
            ...location,
            charOffset: match.index,
          },
          context: this.getSurroundingText(text, match.index, 50),
        });
      }
    } else if (pattern.type === 'keyword') {
      const keywords = pattern.value.split(',').map((k: string) => k.trim());
      const regex = new RegExp(`\\b(${keywords.join('|')})\\b`, 'gi');
      
      let match;
      while ((match = regex.exec(text)) !== null) {
        matches.push({
          ruleId: rule.id,
          ruleName: rule.name,
          category: rule.category,
          severity: rule.severity,
          matchedText: match[0],
          redactedText: this.redactText(match[0], rule.category),
          confidence: pattern.confidence || 0.7,
          location: {
            ...location,
            charOffset: match.index,
          },
          context: this.getSurroundingText(text, match.index, 50),
        });
      }
    }

    return matches;
  }

  private getSurroundingText(text: string, position: number, radius: number): string {
    const start = Math.max(0, position - radius);
    const end = Math.min(text.length, position + radius);
    return text.substring(start, end);
  }

  private redactText(text: string, category: string): string {
    switch (category) {
      case 'pii':
        return '[PII REDACTED]';
      case 'pci':
        return '[PAYMENT INFO REDACTED]';
      case 'phi':
        return '[HEALTH INFO REDACTED]';
      case 'financial':
        return '[FINANCIAL INFO REDACTED]';
      case 'intellectual-property':
        return '[SENSITIVE INFO REDACTED]';
      default:
        return '[REDACTED]';
    }
  }

  private isExempt(rule: DLPRule, metadata: any): boolean {
    for (const exception of rule.exceptions) {
      switch (exception.type) {
        case 'sender':
          if (metadata.sender === exception.value) return true;
          break;
        case 'recipient':
          if (metadata.recipients?.includes(exception.value)) return true;
          break;
        case 'domain':
          if (metadata.sender?.endsWith(exception.value)) return true;
          if (metadata.recipients?.some((r: string) => r.endsWith(exception.value))) return true;
          break;
      }
    }
    return false;
  }

  private calculateOverallRisk(matches: DLPMatch[]): 'low' | 'medium' | 'high' | 'critical' {
    if (matches.length === 0) return 'low';

    const hasCritical = matches.some(m => m.severity === 'critical');
    const hasHigh = matches.some(m => m.severity === 'high');
    const hasMedium = matches.some(m => m.severity === 'medium');

    if (hasCritical) return 'critical';
    if (hasHigh) return 'high';
    if (hasMedium) return 'medium';
    return 'low';
  }

  private async applyActions(matches: DLPMatch[], metadata: any): Promise<Array<{ type: string; applied: boolean; reason?: string }>> {
    const actions: Array<{ type: string; applied: boolean; reason?: string }> = [];
    const appliedActionTypes = new Set<string>();

    for (const match of matches) {
      const rule = this.rules.get(match.ruleId);
      if (!rule) continue;

      for (const action of rule.actions) {
        // Avoid duplicate actions of the same type
        if (appliedActionTypes.has(action.type)) continue;

        try {
          await this.executeAction(action, match, metadata);
          actions.push({ type: action.type, applied: true });
          appliedActionTypes.add(action.type);
        } catch (error) {
          actions.push({
            type: action.type,
            applied: false,
            reason: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    }

    return actions;
  }

  private async executeAction(action: any, match: DLPMatch, metadata: any): Promise<void> {
    switch (action.type) {
      case 'block':
        this.logger.warn('Message blocked by DLP', {
          ruleId: match.ruleId,
          category: match.category,
          severity: match.severity,
          sender: metadata.sender,
        });
        break;

      case 'quarantine':
        this.logger.info('Message quarantined by DLP', {
          ruleId: match.ruleId,
          category: match.category,
        });
        break;

      case 'encrypt':
        this.logger.info('Message marked for encryption by DLP', {
          ruleId: match.ruleId,
        });
        break;

      case 'warn':
        this.logger.info('DLP warning issued', {
          ruleId: match.ruleId,
          category: match.category,
        });
        break;

      case 'log':
        this.logger.info('DLP match logged', {
          ruleId: match.ruleId,
          category: match.category,
          severity: match.severity,
          matchedText: match.redactedText,
        });
        break;

      case 'redact':
        // Redaction would modify the message content
        this.logger.info('Content redacted by DLP', {
          ruleId: match.ruleId,
        });
        break;

      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  getRules(): DLPRule[] {
    return Array.from(this.rules.values());
  }

  getRule(ruleId: string): DLPRule | undefined {
    return this.rules.get(ruleId);
  }

  updateRule(ruleId: string, updates: Partial<DLPRule>): void {
    const existing = this.rules.get(ruleId);
    if (!existing) {
      throw new Error(`Rule ${ruleId} not found`);
    }

    const updated = { ...existing, ...updates, id: ruleId };
    this.rules.set(ruleId, updated);

    this.logger.info('DLP rule updated', { ruleId, updates: Object.keys(updates) });
  }

  async generateReport(
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalScans: number;
    matchesByCategory: Record<string, number>;
    matchesBySeverity: Record<string, number>;
    actionsTaken: Record<string, number>;
    topRules: Array<{ ruleId: string; matches: number }>;
  }> {
    // In production, query from database/logs
    return {
      totalScans: 1000,
      matchesByCategory: {
        pii: 45,
        pci: 12,
        phi: 8,
        financial: 23,
        'intellectual-property': 67,
      },
      matchesBySeverity: {
        low: 89,
        medium: 42,
        high: 18,
        critical: 6,
      },
      actionsTaken: {
        block: 15,
        quarantine: 8,
        encrypt: 12,
        warn: 98,
        log: 155,
      },
      topRules: [
        { ruleId: 'email-addresses', matches: 67 },
        { ruleId: 'ssn', matches: 34 },
        { ruleId: 'api-keys', matches: 23 },
      ],
    };
  }
}
