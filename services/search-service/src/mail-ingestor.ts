import { MailIngest, extractTextFromAttachment } from './ingestors';

export async function ingestMail(mail: MailIngest) {
  // Extract text from attachments using Tika/OCR
  for (const attachment of mail.attachments) {
    const text = await extractTextFromAttachment(attachment.data);
    // Optionally add to mail.tikaText or mail.ocrText
  }
  // TODO: Index mail in OpenSearch
  // Example: opensearch.index({ index: 'messages', body: mail })
}
