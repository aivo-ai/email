import DOMPurify from 'dompurify'
import { JSDOM } from 'jsdom'

const window = new JSDOM('').window
const purify = DOMPurify(window as any)

export interface SanitizeOptions {
  allowedTags?: string[]
  allowedAttributes?: string[]
  stripTags?: boolean
}

export const sanitizeHtmlEmail = (html: string, options: SanitizeOptions = {}): string => {
  const config: any = {
    ALLOWED_TAGS: options.allowedTags || ['p', 'br', 'strong', 'em', 'a', 'img', 'div', 'span'],
    ALLOWED_ATTR: options.allowedAttributes || ['href', 'src', 'alt', 'title', 'class'],
    KEEP_CONTENT: !options.stripTags
  }

  return purify.sanitize(html, config) as unknown as string
}

export const stripHtmlTags = (html: string): string => {
  return purify.sanitize(html, { ALLOWED_TAGS: [], KEEP_CONTENT: true }) as unknown as string
}

export const validateEmailContent = (content: string): boolean => {
  const sanitized = sanitizeHtmlEmail(content)
  return sanitized.length > 0 && sanitized !== content
}
