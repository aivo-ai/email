import fetch from 'node-fetch';

export class TikaExtractor {
  private tikaUrl: string;
  
  constructor(tikaUrl: string) {
    this.tikaUrl = tikaUrl;
  }
  
  async extractText(content: string | Buffer): Promise<string> {
    try {
      const response = await fetch(`${this.tikaUrl}/tika`, {
        method: 'PUT',
        headers: {
          'Accept': 'text/plain',
          'Content-Type': 'application/octet-stream'
        },
        body: content
      });
      
      if (!response.ok) {
        throw new Error(`Tika extraction failed: ${response.statusText}`);
      }
      
      return await response.text();
    } catch (error) {
      console.error('Tika extraction error:', error);
      return '';
    }
  }
  
  async extractMetadata(content: string | Buffer): Promise<Record<string, any>> {
    try {
      const response = await fetch(`${this.tikaUrl}/meta`, {
        method: 'PUT',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/octet-stream'
        },
        body: content
      });
      
      if (!response.ok) {
        throw new Error(`Tika metadata extraction failed: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Tika metadata extraction error:', error);
      return {};
    }
  }
}
