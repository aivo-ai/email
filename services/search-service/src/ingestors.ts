// Ingestor interfaces for mail, calendar, contacts
export interface MailIngest {
  messageId: string;
  userId: string;
  headers: Record<string, string>;
  body: string;
  attachments: Array<{ filename: string; contentType: string; data: Buffer }>;
  tikaText?: string;
  ocrText?: string;
}

export interface CalendarEventIngest {
  eventId: string;
  userId: string;
  summary: string;
  description: string;
  start: string;
  end: string;
  attendees: string[];
}

export interface ContactIngest {
  contactId: string;
  userId: string;
  name: string;
  emails: string[];
  phones?: string[];
  addresses?: string[];
}

// Tika/OCR stub
export async function extractTextFromAttachment(attachment: Buffer): Promise<string> {
  // TODO: Integrate Apache Tika and OCR
  return '';
}
