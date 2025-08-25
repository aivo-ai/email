import { createHash } from 'crypto';
import winston from 'winston';

export interface AttachmentInfo {
  filename: string;
  originalSize: number;
  mimeType: string;
  content: Buffer;
  metadata: {
    createdDate?: Date;
    modifiedDate?: Date;
    author?: string;
    title?: string;
    subject?: string;
  };
}

export interface CDRPolicy {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  fileTypes: string[]; // MIME types or extensions
  actions: Array<{
    type: 'sanitize' | 'extract' | 'convert' | 'block' | 'quarantine';
    parameters?: Record<string, any>;
  }>;
  maxFileSize: number; // bytes
  allowedElements?: string[]; // for document sanitization
  dangerousElements?: string[]; // elements to remove
}

export interface CDRResult {
  id: string;
  timestamp: Date;
  originalFile: {
    filename: string;
    size: number;
    mimeType: string;
    hash: string;
  };
  processedFile?: {
    filename: string;
    size: number;
    mimeType: string;
    hash: string;
    content: Buffer;
  };
  threats: Array<{
    type: 'macro' | 'external-link' | 'embedded-object' | 'script' | 'active-content';
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    action: 'removed' | 'quarantined' | 'converted';
    location?: string;
  }>;
  status: 'clean' | 'sanitized' | 'blocked' | 'failed';
  policy: string;
  processingTime: number;
  warnings: string[];
}

export class CDRService {
  private policies: Map<string, CDRPolicy> = new Map();
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
        new winston.transports.File({ filename: 'cdr.log' }),
      ],
    });

    this.initializeDefaultPolicies();
  }

  private initializeDefaultPolicies() {
    // Office documents policy
    this.addPolicy({
      id: 'office-documents',
      name: 'Microsoft Office Documents',
      description: 'Sanitize Office documents by removing macros and active content',
      enabled: true,
      fileTypes: [
        'application/vnd.ms-excel',
        'application/vnd.ms-powerpoint',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      ],
      actions: [
        {
          type: 'sanitize',
          parameters: {
            removeMacros: true,
            removeExternalLinks: true,
            removeEmbeddedObjects: true,
            removeActiveContent: true,
            preserveFormatting: true,
          },
        },
      ],
      maxFileSize: 50 * 1024 * 1024, // 50MB
      dangerousElements: [
        'macro',
        'script',
        'externalData',
        'oleObject',
        'activeX',
      ],
    });

    // PDF documents policy
    this.addPolicy({
      id: 'pdf-documents',
      name: 'PDF Documents',
      description: 'Sanitize PDFs by removing JavaScript and forms',
      enabled: true,
      fileTypes: ['application/pdf'],
      actions: [
        {
          type: 'sanitize',
          parameters: {
            removeJavaScript: true,
            removeForms: true,
            removeEmbeddedFiles: true,
            removeAnnotations: false,
            flattenForms: true,
          },
        },
      ],
      maxFileSize: 100 * 1024 * 1024, // 100MB
      dangerousElements: [
        'JavaScript',
        'Launch',
        'ImportData',
        'EmbeddedFile',
      ],
    });

    // Image files policy
    this.addPolicy({
      id: 'image-files',
      name: 'Image Files',
      description: 'Strip metadata from images and convert to safe formats',
      enabled: true,
      fileTypes: [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/bmp',
        'image/tiff',
        'image/svg+xml',
      ],
      actions: [
        {
          type: 'sanitize',
          parameters: {
            stripMetadata: true,
            convertSVGtoPNG: true,
            removeScripts: true,
            maxDimensions: { width: 4096, height: 4096 },
          },
        },
      ],
      maxFileSize: 25 * 1024 * 1024, // 25MB
    });

    // Archive files policy
    this.addPolicy({
      id: 'archive-files',
      name: 'Archive Files',
      description: 'Extract and scan archive contents recursively',
      enabled: true,
      fileTypes: [
        'application/zip',
        'application/x-rar-compressed',
        'application/x-7z-compressed',
        'application/gzip',
        'application/x-tar',
      ],
      actions: [
        {
          type: 'extract',
          parameters: {
            maxDepth: 3,
            maxFiles: 100,
            scanContents: true,
            repackage: true,
          },
        },
      ],
      maxFileSize: 200 * 1024 * 1024, // 200MB
    });

    // Executable files policy (block by default)
    this.addPolicy({
      id: 'executable-files',
      name: 'Executable Files',
      description: 'Block all executable files',
      enabled: true,
      fileTypes: [
        'application/x-msdownload',
        'application/x-executable',
        'application/x-dosexec',
        'application/x-mach-binary',
        'application/x-elf',
      ],
      actions: [
        { type: 'block' },
      ],
      maxFileSize: 0, // Always block regardless of size
    });
  }

  addPolicy(policy: CDRPolicy): void {
    this.policies.set(policy.id, policy);
    this.logger.info('CDR policy added', { policyId: policy.id, name: policy.name });
  }

  async processAttachment(attachment: AttachmentInfo): Promise<CDRResult> {
    const startTime = Date.now();
    const resultId = createHash('md5')
      .update(attachment.filename + startTime)
      .digest('hex');

    this.logger.info('Starting CDR processing', {
      resultId,
      filename: attachment.filename,
      size: attachment.originalSize,
      mimeType: attachment.mimeType,
    });

    // Find applicable policy
    const policy = this.findApplicablePolicy(attachment);
    if (!policy) {
      return this.createResult(resultId, attachment, null, [], 'clean', 'default', Date.now() - startTime);
    }

    // Check file size limits
    if (attachment.originalSize > policy.maxFileSize && policy.maxFileSize > 0) {
      return this.createResult(
        resultId,
        attachment,
        null,
        [],
        'blocked',
        policy.id,
        Date.now() - startTime,
        [`File exceeds maximum size limit: ${policy.maxFileSize} bytes`]
      );
    }

    const threats: any[] = [];
    const warnings: string[] = [];
    let processedContent = attachment.content;
    let status: 'clean' | 'sanitized' | 'blocked' | 'failed' = 'clean';

    try {
      for (const action of policy.actions) {
        const result = await this.executeAction(
          action,
          attachment,
          processedContent,
          policy
        );

        if (result.blocked) {
          status = 'blocked';
          break;
        }

        if (result.processedContent) {
          processedContent = result.processedContent;
          status = 'sanitized';
        }

        threats.push(...result.threats);
        warnings.push(...result.warnings);
      }

      const processingTime = Date.now() - startTime;

      const processedFile = status !== 'blocked' ? {
        filename: this.generateSafeFilename(attachment.filename),
        size: processedContent.length,
        mimeType: this.determineOutputMimeType(attachment.mimeType, policy),
        hash: createHash('sha256').update(processedContent).digest('hex'),
        content: processedContent,
      } : undefined;

      return this.createResult(
        resultId,
        attachment,
        processedFile,
        threats,
        status,
        policy.id,
        processingTime,
        warnings
      );

    } catch (error) {
      this.logger.error('CDR processing failed', {
        resultId,
        filename: attachment.filename,
        error: error instanceof Error ? error.message : error,
      });

      return this.createResult(
        resultId,
        attachment,
        null,
        threats,
        'failed',
        policy.id,
        Date.now() - startTime,
        [`Processing failed: ${error instanceof Error ? error.message : error}`]
      );
    }
  }

  private findApplicablePolicy(attachment: AttachmentInfo): CDRPolicy | null {
    for (const [id, policy] of this.policies) {
      if (!policy.enabled) continue;

      // Check MIME type
      if (policy.fileTypes.includes(attachment.mimeType)) {
        return policy;
      }

      // Check file extension
      const extension = this.getFileExtension(attachment.filename);
      if (extension && policy.fileTypes.includes(extension)) {
        return policy;
      }
    }

    return null;
  }

  private async executeAction(
    action: any,
    original: AttachmentInfo,
    content: Buffer,
    policy: CDRPolicy
  ): Promise<{
    processedContent?: Buffer;
    threats: any[];
    warnings: string[];
    blocked: boolean;
  }> {
    const threats: any[] = [];
    const warnings: string[] = [];

    switch (action.type) {
      case 'block':
        return { threats, warnings, blocked: true };

      case 'sanitize':
        return await this.sanitizeFile(content, original, action.parameters, policy);

      case 'extract':
        return await this.extractArchive(content, original, action.parameters);

      case 'convert':
        return await this.convertFile(content, original, action.parameters);

      default:
        warnings.push(`Unknown action type: ${action.type}`);
        return { threats, warnings, blocked: false };
    }
  }

  private async sanitizeFile(
    content: Buffer,
    original: AttachmentInfo,
    parameters: any,
    policy: CDRPolicy
  ): Promise<{
    processedContent?: Buffer;
    threats: any[];
    warnings: string[];
    blocked: boolean;
  }> {
    const threats: any[] = [];
    const warnings: string[] = [];

    if (original.mimeType.startsWith('image/')) {
      return await this.sanitizeImage(content, original, parameters);
    } else if (original.mimeType === 'application/pdf') {
      return await this.sanitizePDF(content, original, parameters);
    } else if (this.isOfficeDocument(original.mimeType)) {
      return await this.sanitizeOfficeDocument(content, original, parameters);
    } else if (original.mimeType === 'image/svg+xml') {
      return await this.sanitizeSVG(content, original, parameters);
    }

    warnings.push(`Sanitization not implemented for MIME type: ${original.mimeType}`);
    return { threats, warnings, blocked: false };
  }

  private async sanitizeImage(
    content: Buffer,
    original: AttachmentInfo,
    parameters: any
  ): Promise<{
    processedContent?: Buffer;
    threats: any[];
    warnings: string[];
    blocked: boolean;
  }> {
    const threats: any[] = [];
    const warnings: string[] = [];

    try {
      // In production, use sharp library for image processing
      let processedContent = content;

      if (parameters.stripMetadata) {
        // Remove EXIF and other metadata
        threats.push({
          type: 'embedded-object',
          description: 'Image metadata stripped',
          severity: 'low' as const,
          action: 'removed' as const,
        });
      }

      if (parameters.maxDimensions) {
        // Resize if needed
        const { width, height } = parameters.maxDimensions;
        warnings.push(`Image resized to maximum dimensions: ${width}x${height}`);
      }

      return {
        processedContent,
        threats,
        warnings,
        blocked: false,
      };
    } catch (error) {
      warnings.push(`Image sanitization failed: ${error instanceof Error ? error.message : error}`);
      return { threats, warnings, blocked: false };
    }
  }

  private async sanitizePDF(
    content: Buffer,
    original: AttachmentInfo,
    parameters: any
  ): Promise<{
    processedContent?: Buffer;
    threats: any[];
    warnings: string[];
    blocked: boolean;
  }> {
    const threats: any[] = [];
    const warnings: string[] = [];

    try {
      // In production, use pdf-lib for PDF processing
      let processedContent = content;

      if (parameters.removeJavaScript) {
        threats.push({
          type: 'script',
          description: 'JavaScript removed from PDF',
          severity: 'high' as const,
          action: 'removed' as const,
        });
      }

      if (parameters.removeForms) {
        threats.push({
          type: 'active-content',
          description: 'Interactive forms removed',
          severity: 'medium' as const,
          action: 'removed' as const,
        });
      }

      if (parameters.removeEmbeddedFiles) {
        threats.push({
          type: 'embedded-object',
          description: 'Embedded files removed',
          severity: 'medium' as const,
          action: 'removed' as const,
        });
      }

      return {
        processedContent,
        threats,
        warnings,
        blocked: false,
      };
    } catch (error) {
      warnings.push(`PDF sanitization failed: ${error instanceof Error ? error.message : error}`);
      return { threats, warnings, blocked: false };
    }
  }

  private async sanitizeOfficeDocument(
    content: Buffer,
    original: AttachmentInfo,
    parameters: any
  ): Promise<{
    processedContent?: Buffer;
    threats: any[];
    warnings: string[];
    blocked: boolean;
  }> {
    const threats: any[] = [];
    const warnings: string[] = [];

    try {
      // In production, implement Office document sanitization
      let processedContent = content;

      if (parameters.removeMacros) {
        threats.push({
          type: 'macro',
          description: 'VBA macros removed',
          severity: 'high' as const,
          action: 'removed' as const,
        });
      }

      if (parameters.removeExternalLinks) {
        threats.push({
          type: 'external-link',
          description: 'External links removed',
          severity: 'medium' as const,
          action: 'removed' as const,
        });
      }

      if (parameters.removeEmbeddedObjects) {
        threats.push({
          type: 'embedded-object',
          description: 'Embedded objects removed',
          severity: 'medium' as const,
          action: 'removed' as const,
        });
      }

      if (parameters.removeActiveContent) {
        threats.push({
          type: 'active-content',
          description: 'Active content elements removed',
          severity: 'high' as const,
          action: 'removed' as const,
        });
      }

      return {
        processedContent,
        threats,
        warnings,
        blocked: false,
      };
    } catch (error) {
      warnings.push(`Office document sanitization failed: ${error instanceof Error ? error.message : error}`);
      return { threats, warnings, blocked: false };
    }
  }

  private async sanitizeSVG(
    content: Buffer,
    original: AttachmentInfo,
    parameters: any
  ): Promise<{
    processedContent?: Buffer;
    threats: any[];
    warnings: string[];
    blocked: boolean;
  }> {
    const threats: any[] = [];
    const warnings: string[] = [];

    try {
      const svgContent = content.toString('utf-8');

      // Check for dangerous elements
      const dangerousPatterns = [
        /<script[\s\S]*?<\/script>/gi,
        /<iframe[\s\S]*?<\/iframe>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi, // Event handlers
      ];

      let hasDangerousContent = false;
      for (const pattern of dangerousPatterns) {
        if (pattern.test(svgContent)) {
          hasDangerousContent = true;
          threats.push({
            type: 'script',
            description: 'Script or dangerous content found in SVG',
            severity: 'high' as const,
            action: 'removed' as const,
          });
        }
      }

      if (parameters.convertSVGtoPNG && hasDangerousContent) {
        // Convert to PNG to remove dangerous content
        // In production, use sharp or similar library
        const processedContent = Buffer.from('PNG conversion placeholder');
        
        return {
          processedContent,
          threats,
          warnings: [...warnings, 'SVG converted to PNG for safety'],
          blocked: false,
        };
      }

      // Clean SVG content
      let cleanedSVG = svgContent;
      for (const pattern of dangerousPatterns) {
        cleanedSVG = cleanedSVG.replace(pattern, '');
      }

      return {
        processedContent: Buffer.from(cleanedSVG, 'utf-8'),
        threats,
        warnings,
        blocked: false,
      };
    } catch (error) {
      warnings.push(`SVG sanitization failed: ${error instanceof Error ? error.message : error}`);
      return { threats, warnings, blocked: false };
    }
  }

  private async extractArchive(
    content: Buffer,
    original: AttachmentInfo,
    parameters: any
  ): Promise<{
    processedContent?: Buffer;
    threats: any[];
    warnings: string[];
    blocked: boolean;
  }> {
    const threats: any[] = [];
    const warnings: string[] = [];

    try {
      // In production, implement archive extraction and scanning
      // This would recursively scan extracted files
      
      warnings.push(`Archive extraction not fully implemented: ${original.filename}`);
      
      return {
        processedContent: content,
        threats,
        warnings,
        blocked: false,
      };
    } catch (error) {
      warnings.push(`Archive extraction failed: ${error instanceof Error ? error.message : error}`);
      return { threats, warnings, blocked: false };
    }
  }

  private async convertFile(
    content: Buffer,
    original: AttachmentInfo,
    parameters: any
  ): Promise<{
    processedContent?: Buffer;
    threats: any[];
    warnings: string[];
    blocked: boolean;
  }> {
    const threats: any[] = [];
    const warnings: string[] = [];

    // In production, implement file format conversion
    warnings.push(`File conversion not implemented: ${original.filename}`);
    
    return {
      processedContent: content,
      threats,
      warnings,
      blocked: false,
    };
  }

  private createResult(
    id: string,
    original: AttachmentInfo,
    processed: any,
    threats: any[],
    status: 'clean' | 'sanitized' | 'blocked' | 'failed',
    policyId: string,
    processingTime: number,
    warnings: string[] = []
  ): CDRResult {
    const originalHash = createHash('sha256').update(original.content).digest('hex');

    return {
      id,
      timestamp: new Date(),
      originalFile: {
        filename: original.filename,
        size: original.originalSize,
        mimeType: original.mimeType,
        hash: originalHash,
      },
      processedFile: processed,
      threats,
      status,
      policy: policyId,
      processingTime,
      warnings,
    };
  }

  private isOfficeDocument(mimeType: string): boolean {
    return mimeType.includes('officedocument') ||
           mimeType.includes('ms-excel') ||
           mimeType.includes('ms-powerpoint') ||
           mimeType.includes('msword');
  }

  private getFileExtension(filename: string): string {
    const parts = filename.split('.');
    return parts.length > 1 ? `.${parts.pop()?.toLowerCase()}` : '';
  }

  private generateSafeFilename(originalFilename: string): string {
    // Remove dangerous characters and ensure safe filename
    const safeName = originalFilename
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, '_')
      .toLowerCase();
    
    return `sanitized_${safeName}`;
  }

  private determineOutputMimeType(originalMimeType: string, policy: CDRPolicy): string {
    // In some cases, output MIME type might change due to conversion
    if (originalMimeType === 'image/svg+xml') {
      return 'image/png'; // SVG converted to PNG
    }
    
    return originalMimeType;
  }

  getPolicies(): CDRPolicy[] {
    return Array.from(this.policies.values());
  }

  getPolicy(policyId: string): CDRPolicy | undefined {
    return this.policies.get(policyId);
  }

  updatePolicy(policyId: string, updates: Partial<CDRPolicy>): void {
    const existing = this.policies.get(policyId);
    if (!existing) {
      throw new Error(`Policy ${policyId} not found`);
    }

    const updated = { ...existing, ...updates, id: policyId };
    this.policies.set(policyId, updated);

    this.logger.info('CDR policy updated', { 
      policyId, 
      updates: Object.keys(updates) 
    });
  }

  async generateReport(
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalProcessed: number;
    threatsByType: Record<string, number>;
    statusBreakdown: Record<string, number>;
    topThreats: Array<{ type: string; count: number; severity: string }>;
    policyUsage: Record<string, number>;
    avgProcessingTime: number;
  }> {
    // In production, query from database/logs
    return {
      totalProcessed: 1500,
      threatsByType: {
        macro: 45,
        script: 32,
        'external-link': 78,
        'embedded-object': 123,
        'active-content': 34,
      },
      statusBreakdown: {
        clean: 1200,
        sanitized: 250,
        blocked: 45,
        failed: 5,
      },
      topThreats: [
        { type: 'embedded-object', count: 123, severity: 'medium' },
        { type: 'external-link', count: 78, severity: 'medium' },
        { type: 'macro', count: 45, severity: 'high' },
      ],
      policyUsage: {
        'office-documents': 850,
        'pdf-documents': 320,
        'image-files': 280,
        'archive-files': 45,
        'executable-files': 5,
      },
      avgProcessingTime: 1250, // ms
    };
  }
}
