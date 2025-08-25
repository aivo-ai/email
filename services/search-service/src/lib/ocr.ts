import Tesseract from 'tesseract.js';

export class OCRProcessor {
  private worker: Tesseract.Worker | null = null;
  
  constructor() {
    this.initializeWorker();
  }
  
  private async initializeWorker(): Promise<void> {
    try {
      this.worker = await Tesseract.createWorker({
        logger: m => {
          if (m.status === 'recognizing text') {
            console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        }
      });
      
      await this.worker.loadLanguage('eng');
      await this.worker.initialize('eng');
    } catch (error) {
      console.error('Failed to initialize OCR worker:', error);
    }
  }
  
  async extractText(imageData: string | Buffer): Promise<string> {
    if (!this.worker) {
      console.warn('OCR worker not initialized');
      return '';
    }
    
    try {
      const { data: { text } } = await this.worker.recognize(imageData);
      return text.trim();
    } catch (error) {
      console.error('OCR extraction error:', error);
      return '';
    }
  }
  
  async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }
}
