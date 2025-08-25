import { OpenSearchClient } from '../lib/opensearch.js';
import { Pool } from 'pg';
import { TikaExtractor } from '../lib/tika.js';
import { OCRProcessor } from '../lib/ocr.js';
import { config } from '../config.js';

export interface EmailContent {
  id: string;
  userId: string;
  folderId: string;
  headers: Record<string, string>;
  subject: string;
  body: string;
  attachments: Attachment[];
  timestamp: Date;
}

export interface Attachment {
  id: string;
  filename: string;
  contentType: string;
  content?: string;
  extractedText?: string;
}

export interface CalendarEvent {
  id: string;
  userId: string;
  title: string;
  description: string;
  location: string;
  attendees: string[];
  startTime: Date;
  endTime: Date;
}

export interface Contact {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone?: string;
  organization?: string;
  notes?: string;
}

export class IngestorService {
  private db: Pool;
  private openSearch: OpenSearchClient;
  private tika: TikaExtractor;
  private ocr: OCRProcessor;
  
  constructor(dbConfig: any, openSearch: OpenSearchClient) {
    this.db = new Pool(dbConfig);
    this.openSearch = openSearch;
    this.tika = new TikaExtractor(config.tika.url);
    this.ocr = new OCRProcessor();
    
    this.initializeIndices();
  }
  
  private async initializeIndices(): Promise<void> {
    // Email index mapping
    await this.openSearch.createIndex('emails', {
      properties: {
        userId: { type: 'keyword' },
        folderId: { type: 'keyword' },
        subject: { 
          type: 'text', 
          analyzer: 'email_analyzer',
          fields: { keyword: { type: 'keyword' } }
        },
        body: { 
          type: 'text', 
          analyzer: 'email_analyzer' 
        },
        headers: {
          properties: {
            from: { type: 'keyword' },
            to: { type: 'keyword' },
            cc: { type: 'keyword' },
            date: { type: 'date' }
          }
        },
        attachments: {
          type: 'nested',
          properties: {
            filename: { type: 'text' },
            contentType: { type: 'keyword' },
            extractedText: { type: 'text', analyzer: 'email_analyzer' }
          }
        },
        timestamp: { type: 'date' }
      }
    });
    
    // Calendar events index
    await this.openSearch.createIndex('calendar', {
      properties: {
        userId: { type: 'keyword' },
        title: { type: 'text', analyzer: 'email_analyzer' },
        description: { type: 'text', analyzer: 'email_analyzer' },
        location: { type: 'text' },
        attendees: { type: 'keyword' },
        startTime: { type: 'date' },
        endTime: { type: 'date' }
      }
    });
    
    // Contacts index
    await this.openSearch.createIndex('contacts', {
      properties: {
        userId: { type: 'keyword' },
        name: { type: 'text', analyzer: 'email_analyzer' },
        email: { type: 'keyword' },
        phone: { type: 'keyword' },
        organization: { type: 'text' },
        notes: { type: 'text', analyzer: 'email_analyzer' }
      }
    });
  }
  
  async ingestEmail(email: EmailContent): Promise<void> {
    // Process attachments
    const processedAttachments = await Promise.all(
      email.attachments.map(async (attachment) => {
        let extractedText = '';
        
        if (attachment.content) {
          // Use Tika for document extraction
          if (this.isDocumentType(attachment.contentType)) {
            extractedText = await this.tika.extractText(attachment.content);
          }
          // Use OCR for images
          else if (this.isImageType(attachment.contentType)) {
            extractedText = await this.ocr.extractText(attachment.content);
          }
        }
        
        return {
          ...attachment,
          extractedText
        };
      })
    );
    
    const document = {
      userId: email.userId,
      folderId: email.folderId,
      subject: email.subject,
      body: email.body,
      headers: email.headers,
      attachments: processedAttachments,
      timestamp: email.timestamp
    };
    
    await this.openSearch.indexDocument('emails', email.id, document);
  }
  
  async ingestCalendarEvent(event: CalendarEvent): Promise<void> {
    const document = {
      userId: event.userId,
      title: event.title,
      description: event.description,
      location: event.location,
      attendees: event.attendees,
      startTime: event.startTime,
      endTime: event.endTime
    };
    
    await this.openSearch.indexDocument('calendar', event.id, document);
  }
  
  async ingestContact(contact: Contact): Promise<void> {
    const document = {
      userId: contact.userId,
      name: contact.name,
      email: contact.email,
      phone: contact.phone,
      organization: contact.organization,
      notes: contact.notes
    };
    
    await this.openSearch.indexDocument('contacts', contact.id, document);
  }
  
  private isDocumentType(contentType: string): boolean {
    return [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/html'
    ].includes(contentType);
  }
  
  private isImageType(contentType: string): boolean {
    return contentType.startsWith('image/');
  }
  
  async removeEmail(emailId: string): Promise<void> {
    await this.openSearch.deleteDocument('emails', emailId);
  }
  
  async removeCalendarEvent(eventId: string): Promise<void> {
    await this.openSearch.deleteDocument('calendar', eventId);
  }
  
  async removeContact(contactId: string): Promise<void> {
    await this.openSearch.deleteDocument('contacts', contactId);
  }
}
