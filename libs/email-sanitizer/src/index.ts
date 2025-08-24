import DOMPurify from 'dompurify'
import { JSDOM } from 'jsdom'

// Initialize DOMPurify for Node.js environment
const window = new JSDOM('').window
const purify = DOMPurify(window as any)

export interface SanitizeOptions {
  allowImages?: boolean
  mediaProxyUrl?: string
}

/**
 * Sanitize HTML email content for safe display
 * - Strips all scripts and potentially dangerous content
 * - Replaces img src with data-ce-src to block images by default
 * - Optionally allows images through media proxy
 */
export function sanitizeEmailHtml(html: string, options: SanitizeOptions = {}): string {
  const { allowImages = false, mediaProxyUrl = 'http://localhost:8091/proxy' } = options

  // Configure DOMPurify
  const config = {
    // Allow basic HTML formatting
    ALLOWED_TAGS: [
      'p', 'br', 'div', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'strong', 'b', 'em', 'i', 'u', 'strike', 'del', 'ins',
      'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
      'table', 'thead', 'tbody', 'tr', 'td', 'th',
      'a', 'img', 'hr'
    ],
    
    // Allow safe attributes
    ALLOWED_ATTR: [
      'class', 'id', 'style', 'title', 'alt', 'width', 'height',
      'href', 'target', 'rel', 'src', 'data-ce-src', 'data-ce-blocked'
    ],
    
    // Remove scripts, objects, embeds, forms, iframes
    FORBID_TAGS: ['script', 'object', 'embed', 'form', 'iframe', 'frame', 'frameset'],
    
    // Remove dangerous attributes
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
    
    // Keep content of forbidden elements
    KEEP_CONTENT: true,
    
    // Return DOM for post-processing
    RETURN_DOM: true
  }

  // Sanitize the HTML
  const cleanDom = purify.sanitize(html, config) as unknown as DocumentFragment
  
  // Convert back to DOM for manipulation
  const container = window.document.createElement('div')
  container.appendChild(cleanDom)
  
  // Process images
  const images = container.querySelectorAll('img')
  images.forEach(img => {
    const originalSrc = img.getAttribute('src')
    
    if (originalSrc) {
      // Always set data-ce-src for frontend to decide
      img.setAttribute('data-ce-src', originalSrc)
      
      if (allowImages && mediaProxyUrl) {
        // Route through media proxy
        const proxiedUrl = `${mediaProxyUrl}?url=${encodeURIComponent(originalSrc)}`
        img.setAttribute('src', proxiedUrl)
      } else {
        // Block image by removing src
        img.removeAttribute('src')
        img.setAttribute('data-ce-blocked', 'true')
        img.setAttribute('alt', img.getAttribute('alt') || 'Image blocked for security')
      }
    }
  })
  
  // Process links to make them safe
  const links = container.querySelectorAll('a')
  links.forEach(link => {
    // Force external links to open in new tab
    link.setAttribute('target', '_blank')
    link.setAttribute('rel', 'noopener noreferrer')
    
    const href = link.getAttribute('href')
    if (href) {
      // Only allow http/https links
      try {
        const url = new URL(href)
        if (!['http:', 'https:', 'mailto:'].includes(url.protocol)) {
          link.removeAttribute('href')
          link.setAttribute('data-ce-blocked-url', href)
        }
      } catch {
        // Invalid URL, remove it
        link.removeAttribute('href')
        link.setAttribute('data-ce-blocked-url', href)
      }
    }
  })
  
  // Remove any remaining dangerous CSS
  const elementsWithStyle = container.querySelectorAll('[style]')
  elementsWithStyle.forEach(element => {
    const style = element.getAttribute('style') || ''
    
    // Remove dangerous CSS properties
    const safeCss = style
      .split(';')
      .filter(prop => {
        const lowerProp = prop.toLowerCase()
        return !lowerProp.includes('javascript:') &&
               !lowerProp.includes('expression(') &&
               !lowerProp.includes('@import') &&
               !lowerProp.includes('url(')
      })
      .join(';')
    
    if (safeCss !== style) {
      element.setAttribute('style', safeCss)
    }
  })
  
  return container.innerHTML
}

/**
 * Extract plain text from HTML email content
 */
export function extractPlainText(html: string): string {
  const window = new JSDOM('').window
  const container = window.document.createElement('div')
  container.innerHTML = html
  
  // Remove script and style content completely
  const scripts = container.querySelectorAll('script, style')
  scripts.forEach(el => el.remove())
  
  return container.textContent || container.innerText || ''
}

/**
 * Generate a preview snippet from email content
 */
export function generateEmailPreview(html: string, maxLength: number = 150): string {
  const plainText = extractPlainText(html)
  
  // Clean up whitespace and normalize
  const cleaned = plainText
    .replace(/\s+/g, ' ')
    .trim()
  
  if (cleaned.length <= maxLength) {
    return cleaned
  }
  
  // Truncate at word boundary
  const truncated = cleaned.substring(0, maxLength)
  const lastSpaceIndex = truncated.lastIndexOf(' ')
  
  if (lastSpaceIndex > maxLength * 0.7) {
    return truncated.substring(0, lastSpaceIndex) + '...'
  }
  
  return truncated + '...'
}

/**
 * Check if HTML content contains potentially dangerous elements
 */
export function detectUnsafeContent(html: string): {
  hasScripts: boolean
  hasExternalImages: boolean
  hasExternalLinks: boolean
  hasDangerousAttributes: boolean
} {
  // Check raw HTML before sanitization
  const hasScripts = html.includes('<script') || html.includes('</script>')
  const hasDangerousAttributes = html.includes('javascript:') ||
                                html.includes('onerror=') ||
                                html.includes('onload=') ||
                                html.includes('onclick=') ||
                                html.includes('onmouseover=') ||
                                html.includes('onfocus=') ||
                                html.includes('onblur=')
  
  // Parse for DOM-based checks
  const window = new JSDOM('').window
  const container = window.document.createElement('div')
  container.innerHTML = html
  
  const hasExternalImages = Array.from(container.querySelectorAll('img')).some(img => {
    const src = img.getAttribute('src')
    return src && (src.startsWith('http://') || src.startsWith('https://'))
  })
  const hasExternalLinks = Array.from(container.querySelectorAll('a')).some(link => {
    const href = link.getAttribute('href')
    return href && (href.startsWith('http://') || href.startsWith('https://'))
  })
  
  return {
    hasScripts,
    hasExternalImages,
    hasExternalLinks,
    hasDangerousAttributes
  }
}

// Legacy exports for backward compatibility
export const sanitizeHtmlEmail = sanitizeEmailHtml
export const stripHtmlTags = (html: string): string => extractPlainText(html)
export const validateEmailContent = (content: string): boolean => {
  const sanitized = sanitizeEmailHtml(content)
  return sanitized.length > 0
}

export default {
  sanitizeEmailHtml,
  extractPlainText,
  generateEmailPreview,
  detectUnsafeContent,
  // Legacy
  sanitizeHtmlEmail,
  stripHtmlTags,
  validateEmailContent
}
