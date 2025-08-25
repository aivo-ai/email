import { createSign, createVerify } from 'crypto';

export interface ARCHeader {
  instance: number;
  authResults: string;
  messageSignature: string;
  seal: string;
}

export class ARCSealer {
  private privateKey: string;
  private selector: string;
  private domain: string;

  constructor(privateKey: string, selector: string, domain: string) {
    this.privateKey = privateKey;
    this.selector = selector;
    this.domain = domain;
  }

  sealMessage(
    headers: Record<string, string>,
    authResults: string,
    previousARCHeaders: ARCHeader[] = []
  ): { 'ARC-Authentication-Results': string; 'ARC-Message-Signature': string; 'ARC-Seal': string } {
    const instance = previousARCHeaders.length + 1;

    // Create ARC-Authentication-Results header
    const arcAuthResults = `i=${instance}; ${this.domain}; ${authResults}`;

    // Create ARC-Message-Signature header
    const canonicalizedHeaders = this.canonicalizeHeaders(headers);
    const arcMessageSignature = this.signHeaders(canonicalizedHeaders, instance);

    // Create ARC-Seal header
    const arcSeal = this.createARCSeal(instance, previousARCHeaders);

    return {
      'ARC-Authentication-Results': arcAuthResults,
      'ARC-Message-Signature': arcMessageSignature,
      'ARC-Seal': arcSeal,
    };
  }

  private canonicalizeHeaders(headers: Record<string, string>): string {
    // Implement relaxed canonicalization for headers
    const headerList = ['from', 'to', 'subject', 'date', 'message-id'];
    return headerList
      .filter(name => headers[name])
      .map(name => `${name.toLowerCase()}:${headers[name].trim().replace(/\s+/g, ' ')}`)
      .join('\r\n');
  }

  private signHeaders(canonicalizedHeaders: string, instance: number): string {
    const headerToSign = `i=${instance}; a=rsa-sha256; c=relaxed/relaxed; d=${this.domain}; s=${this.selector}; h=from:to:subject:date:message-id; bh=; b=`;
    const dataToSign = canonicalizedHeaders + '\r\n' + headerToSign;

    const signer = createSign('sha256');
    signer.update(dataToSign);
    const signature = signer.sign(this.privateKey, 'base64');

    return `i=${instance}; a=rsa-sha256; c=relaxed/relaxed; d=${this.domain}; s=${this.selector}; h=from:to:subject:date:message-id; bh=; b=${signature}`;
  }

  private createARCSeal(instance: number, previousARCHeaders: ARCHeader[]): string {
    // Create chain validation value (cv)
    let chainValidation = 'none';
    if (previousARCHeaders.length > 0) {
      chainValidation = this.validateARCChain(previousARCHeaders) ? 'pass' : 'fail';
    }

    const sealHeader = `i=${instance}; a=rsa-sha256; t=${Math.floor(Date.now() / 1000)}; cv=${chainValidation}; d=${this.domain}; s=${this.selector}; b=`;
    
    const signer = createSign('sha256');
    signer.update(sealHeader);
    const signature = signer.sign(this.privateKey, 'base64');

    return `${sealHeader}${signature}`;
  }

  private validateARCChain(arcHeaders: ARCHeader[]): boolean {
    // Validate the existing ARC chain
    // This is a simplified implementation
    return arcHeaders.every(header => {
      // In a real implementation, verify each signature
      return header.instance > 0 && header.authResults && header.messageSignature && header.seal;
    });
  }

  static parseARCHeaders(headers: Record<string, string>): ARCHeader[] {
    const arcHeaders: ARCHeader[] = [];
    
    // Parse existing ARC headers from the message
    Object.keys(headers).forEach(key => {
      if (key.toLowerCase().startsWith('arc-')) {
        const instanceMatch = headers[key].match(/i=(\d+)/);
        if (instanceMatch) {
          const instance = parseInt(instanceMatch[1]);
          const existing = arcHeaders.find(h => h.instance === instance);
          
          if (!existing) {
            arcHeaders.push({
              instance,
              authResults: '',
              messageSignature: '',
              seal: '',
            });
          }

          const header = arcHeaders.find(h => h.instance === instance)!;
          
          if (key.toLowerCase().includes('authentication-results')) {
            header.authResults = headers[key];
          } else if (key.toLowerCase().includes('message-signature')) {
            header.messageSignature = headers[key];
          } else if (key.toLowerCase().includes('seal')) {
            header.seal = headers[key];
          }
        }
      }
    });

    return arcHeaders.sort((a, b) => a.instance - b.instance);
  }
}
