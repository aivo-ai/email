import { S3Client, PutObjectCommand, HeadObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { GlacierClient, InitiateJobCommand, DescribeJobCommand } from '@aws-sdk/client-glacier';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createHash, randomUUID } from 'crypto';
import { simpleParser, ParsedMail } from 'mailparser';
import winston from 'winston';

export interface JournalEntry {
  id: string;
  messageId: string;
  timestamp: Date;
  direction: 'inbound' | 'outbound';
  sender: string;
  recipients: string[];
  subject: string;
  size: number;
  contentHash: string;
  s3Key: string;
  glacierArchiveId?: string;
  retentionUntil: Date;
  legalHold: boolean;
  tags: Record<string, string>;
  compliance: {
    sox?: boolean;
    hipaa?: boolean;
    gdpr?: boolean;
    finra?: boolean;
  };
}

export interface RetentionPolicy {
  id: string;
  name: string;
  description: string;
  retentionDays: number;
  glacierDays: number;
  enabled: boolean;
  conditions: {
    senderDomains?: string[];
    recipientDomains?: string[];
    subjectPatterns?: string[];
    hasAttachments?: boolean;
    complianceFlags?: string[];
  };
}

export interface SearchQuery {
  startDate?: Date;
  endDate?: Date;
  sender?: string;
  recipient?: string;
  subject?: string;
  messageId?: string;
  contentHash?: string;
  tags?: Record<string, string>;
  compliance?: string[];
  legalHold?: boolean;
  limit?: number;
  offset?: number;
}

export class JournalingService {
  private s3Client: S3Client;
  private glacierClient: GlacierClient;
  private logger: winston.Logger;
  private bucket: string;
  private glacierVault: string;
  private retentionPolicies: Map<string, RetentionPolicy> = new Map();

  constructor(
    region: string = 'us-east-1',
    bucket: string = 'email-journal',
    glacierVault: string = 'email-archive'
  ) {
    this.s3Client = new S3Client({ region });
    this.glacierClient = new GlacierClient({ region });
    this.bucket = bucket;
    this.glacierVault = glacierVault;

    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'journaling.log' }),
      ],
    });

    this.initializeDefaultPolicies();
  }

  private initializeDefaultPolicies() {
    // SOX compliance - 7 years
    this.retentionPolicies.set('sox', {
      id: 'sox',
      name: 'SOX Compliance',
      description: 'Sarbanes-Oxley Act compliance - 7 year retention',
      retentionDays: 7 * 365,
      glacierDays: 90,
      enabled: true,
      conditions: {
        complianceFlags: ['sox'],
      },
    });

    // FINRA compliance - 3 years, 7 years for some
    this.retentionPolicies.set('finra', {
      id: 'finra',
      name: 'FINRA Compliance',
      description: 'Financial Industry Regulatory Authority compliance',
      retentionDays: 7 * 365,
      glacierDays: 90,
      enabled: true,
      conditions: {
        complianceFlags: ['finra'],
      },
    });

    // HIPAA compliance - 6 years
    this.retentionPolicies.set('hipaa', {
      id: 'hipaa',
      name: 'HIPAA Compliance',
      description: 'Health Insurance Portability and Accountability Act',
      retentionDays: 6 * 365,
      glacierDays: 180,
      enabled: true,
      conditions: {
        complianceFlags: ['hipaa'],
      },
    });

    // General business - 3 years
    this.retentionPolicies.set('general', {
      id: 'general',
      name: 'General Business',
      description: 'Standard business email retention',
      retentionDays: 3 * 365,
      glacierDays: 365,
      enabled: true,
      conditions: {},
    });
  }

  async journalMessage(
    rawMessage: string,
    direction: 'inbound' | 'outbound',
    metadata: {
      messageId?: string;
      sender?: string;
      recipients?: string[];
      timestamp?: Date;
      tags?: Record<string, string>;
      compliance?: {
        sox?: boolean;
        hipaa?: boolean;
        gdpr?: boolean;
        finra?: boolean;
      };
    } = {}
  ): Promise<JournalEntry> {
    try {
      // Parse email
      const parsed = await simpleParser(rawMessage);
      
      // Generate content hash for integrity
      const contentHash = createHash('sha256').update(rawMessage).digest('hex');
      
      // Determine applicable retention policy
      const policy = this.determineRetentionPolicy(parsed, metadata);
      
      // Create journal entry
      const entry: JournalEntry = {
        id: randomUUID(),
        messageId: metadata.messageId || parsed.messageId || randomUUID(),
        timestamp: metadata.timestamp || new Date(),
        direction,
        sender: metadata.sender || parsed.from?.text || '',
        recipients: metadata.recipients || this.extractRecipients(parsed),
        subject: parsed.subject || '',
        size: Buffer.byteLength(rawMessage, 'utf8'),
        contentHash,
        s3Key: this.generateS3Key(parsed, direction),
        retentionUntil: this.calculateRetentionDate(policy),
        legalHold: false,
        tags: metadata.tags || {},
        compliance: metadata.compliance || {},
      };

      // Store in S3 with WORM compliance
      await this.storeInS3(entry.s3Key, rawMessage, entry);
      
      // Log journal entry (in production, store in database)
      this.logger.info('Message journaled', {
        entryId: entry.id,
        messageId: entry.messageId,
        direction: entry.direction,
        size: entry.size,
        policy: policy.id,
      });

      return entry;
    } catch (error) {
      this.logger.error('Failed to journal message', { error: error instanceof Error ? error.message : error });
      throw error;
    }
  }

  private extractRecipients(parsed: ParsedMail): string[] {
    const recipients: string[] = [];
    
    if (parsed.to) {
      if (Array.isArray(parsed.to)) {
        recipients.push(...parsed.to.map(addr => addr.text));
      } else {
        recipients.push(parsed.to.text);
      }
    }
    
    if (parsed.cc) {
      if (Array.isArray(parsed.cc)) {
        recipients.push(...parsed.cc.map(addr => addr.text));
      } else {
        recipients.push(parsed.cc.text);
      }
    }
    
    if (parsed.bcc) {
      if (Array.isArray(parsed.bcc)) {
        recipients.push(...parsed.bcc.map(addr => addr.text));
      } else {
        recipients.push(parsed.bcc.text);
      }
    }

    return recipients;
  }

  private determineRetentionPolicy(parsed: ParsedMail, metadata: any): RetentionPolicy {
    // Check compliance flags first
    if (metadata.compliance?.sox) {
      return this.retentionPolicies.get('sox')!;
    }
    if (metadata.compliance?.finra) {
      return this.retentionPolicies.get('finra')!;
    }
    if (metadata.compliance?.hipaa) {
      return this.retentionPolicies.get('hipaa')!;
    }

    // Check domain-based rules
    for (const [id, policy] of this.retentionPolicies) {
      if (this.matchesPolicy(parsed, policy)) {
        return policy;
      }
    }

    // Default to general policy
    return this.retentionPolicies.get('general')!;
  }

  private matchesPolicy(parsed: ParsedMail, policy: RetentionPolicy): boolean {
    const conditions = policy.conditions;

    // Check sender domains
    if (conditions.senderDomains && parsed.from) {
      const senderDomain = parsed.from.text.split('@')[1];
      if (!conditions.senderDomains.includes(senderDomain)) {
        return false;
      }
    }

    // Check subject patterns
    if (conditions.subjectPatterns && parsed.subject) {
      const matches = conditions.subjectPatterns.some(pattern => 
        new RegExp(pattern, 'i').test(parsed.subject!)
      );
      if (!matches) {
        return false;
      }
    }

    // Check attachments
    if (conditions.hasAttachments !== undefined) {
      const hasAttachments = parsed.attachments && parsed.attachments.length > 0;
      if (conditions.hasAttachments !== hasAttachments) {
        return false;
      }
    }

    return true;
  }

  private calculateRetentionDate(policy: RetentionPolicy): Date {
    const retentionDate = new Date();
    retentionDate.setDate(retentionDate.getDate() + policy.retentionDays);
    return retentionDate;
  }

  private generateS3Key(parsed: ParsedMail, direction: string): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const messageId = parsed.messageId || randomUUID();
    
    return `journal/${year}/${month}/${day}/${direction}/${messageId}.eml`;
  }

  private async storeInS3(key: string, content: string, entry: JournalEntry): Promise<void> {
    const metadata = {
      'journal-id': entry.id,
      'message-id': entry.messageId,
      'direction': entry.direction,
      'content-hash': entry.contentHash,
      'retention-until': entry.retentionUntil.toISOString(),
      'legal-hold': entry.legalHold.toString(),
    };

    // Add compliance flags
    Object.entries(entry.compliance).forEach(([key, value]) => {
      if (value) {
        metadata[`compliance-${key}`] = 'true';
      }
    });

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: content,
      Metadata: metadata,
      StorageClass: 'STANDARD_IA', // Cheaper for infrequent access
      ServerSideEncryption: 'AES256',
      ObjectLockMode: 'GOVERNANCE', // WORM compliance
      ObjectLockRetainUntilDate: entry.retentionUntil,
    });

    await this.s3Client.send(command);
  }

  async retrieveMessage(entryId: string): Promise<{ entry: JournalEntry; content: string }> {
    // In production, lookup entry from database
    const entry = await this.getJournalEntry(entryId);
    
    try {
      // Try S3 first
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: entry.s3Key,
      });

      const response = await this.s3Client.send(command);
      const content = await response.Body!.transformToString();

      return { entry, content };
    } catch (error) {
      // If not in S3, check Glacier
      if (entry.glacierArchiveId) {
        return await this.retrieveFromGlacier(entry);
      }
      throw error;
    }
  }

  private async retrieveFromGlacier(entry: JournalEntry): Promise<{ entry: JournalEntry; content: string }> {
    // Initiate Glacier retrieval job
    const jobCommand = new InitiateJobCommand({
      vaultName: this.glacierVault,
      jobParameters: {
        Type: 'archive-retrieval',
        ArchiveId: entry.glacierArchiveId,
        Tier: 'Standard', // 3-5 hours
      },
    });

    const jobResponse = await this.glacierClient.send(jobCommand);
    
    // In production, implement polling mechanism
    throw new Error(`Glacier retrieval initiated. Job ID: ${jobResponse.jobId}. Retrieval takes 3-5 hours.`);
  }

  async searchJournal(query: SearchQuery): Promise<{ entries: JournalEntry[]; total: number }> {
    // In production, implement database search with indexing
    const mockEntries: JournalEntry[] = [];
    
    return {
      entries: mockEntries.slice(query.offset || 0, (query.offset || 0) + (query.limit || 50)),
      total: mockEntries.length,
    };
  }

  async setLegalHold(entryId: string, hold: boolean, reason?: string): Promise<void> {
    const entry = await this.getJournalEntry(entryId);
    
    // Update legal hold status
    entry.legalHold = hold;
    
    // Update S3 object metadata
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: entry.s3Key,
      MetadataDirective: 'REPLACE',
      Metadata: {
        ...await this.getS3Metadata(entry.s3Key),
        'legal-hold': hold.toString(),
        'legal-hold-reason': reason || '',
        'legal-hold-date': new Date().toISOString(),
      },
    });

    await this.s3Client.send(command);
    
    this.logger.info('Legal hold updated', {
      entryId,
      hold,
      reason,
    });
  }

  private async getS3Metadata(key: string): Promise<Record<string, string>> {
    const command = new HeadObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    const response = await this.s3Client.send(command);
    return response.Metadata || {};
  }

  private async getJournalEntry(entryId: string): Promise<JournalEntry> {
    // In production, query from database
    throw new Error('Journal entry not found');
  }

  async generateEDiscoveryExport(
    query: SearchQuery,
    format: 'pst' | 'mbox' | 'eml' = 'eml'
  ): Promise<{ downloadUrl: string; expiresAt: Date }> {
    const results = await this.searchJournal(query);
    
    // In production, implement export generation
    const exportKey = `exports/${randomUUID()}.${format}`;
    
    // Generate presigned URL for download
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: exportKey,
    });

    const downloadUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: 24 * 60 * 60, // 24 hours
    });

    return {
      downloadUrl,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };
  }

  async getComplianceReport(
    startDate: Date,
    endDate: Date,
    complianceType?: string
  ): Promise<{
    totalMessages: number;
    messagesByCompliance: Record<string, number>;
    storageUsage: number;
    retentionBreakdown: Record<string, number>;
  }> {
    // In production, implement comprehensive reporting
    return {
      totalMessages: 10000,
      messagesByCompliance: {
        sox: 1500,
        finra: 800,
        hipaa: 600,
        general: 7100,
      },
      storageUsage: 50 * 1024 * 1024 * 1024, // 50GB
      retentionBreakdown: {
        's3': 8000,
        'glacier': 2000,
      },
    };
  }

  async validateIntegrity(entryId: string): Promise<{ valid: boolean; errors: string[] }> {
    const entry = await this.getJournalEntry(entryId);
    const { content } = await this.retrieveMessage(entryId);
    
    // Recalculate hash
    const currentHash = createHash('sha256').update(content).digest('hex');
    
    const errors: string[] = [];
    if (currentHash !== entry.contentHash) {
      errors.push('Content hash mismatch - message may be corrupted');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
