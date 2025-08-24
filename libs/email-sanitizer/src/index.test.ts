import { describe, it, expect } from 'vitest'
import { sanitizeEmailHtml, extractPlainText, generateEmailPreview, detectUnsafeContent } from './index'

describe('Email Sanitizer', () => {
  describe('sanitizeEmailHtml', () => {
    it('should strip script tags', () => {
      const maliciousHtml = `
        <div>
          <p>Hello World</p>
          <script>alert('xss')</script>
          <p>Safe content</p>
        </div>
      `
      
      const sanitized = sanitizeEmailHtml(maliciousHtml)
      
      expect(sanitized).not.toContain('<script>')
      expect(sanitized).not.toContain('alert(')
      expect(sanitized).toContain('Hello World')
      expect(sanitized).toContain('Safe content')
    })

    it('should block iframe tags', () => {
      const htmlWithIframe = `
        <div>
          <p>Content</p>
          <iframe src="https://evil.com"></iframe>
          <p>More content</p>
        </div>
      `
      
      const sanitized = sanitizeEmailHtml(htmlWithIframe)
      
      expect(sanitized).not.toContain('<iframe>')
      expect(sanitized).not.toContain('evil.com')
      expect(sanitized).toContain('Content')
      expect(sanitized).toContain('More content')
    })

    it('should replace img src with data-ce-src by default', () => {
      const htmlWithImages = `
        <div>
          <p>Check out this image:</p>
          <img src="https://example.com/image.jpg" alt="Test image" />
          <p>End of content</p>
        </div>
      `
      
      const sanitized = sanitizeEmailHtml(htmlWithImages)
      
      // Should contain data-ce-src instead of src
      expect(sanitized).toContain('data-ce-src="https://example.com/image.jpg"')
      
      // Should have blocked indicator
      expect(sanitized).toContain('data-ce-blocked="true"')
      
      // Should preserve alt text
      expect(sanitized).toContain('alt="Test image"')
      
      // Should not have any src attribute when images are blocked
      expect(sanitized).not.toMatch(/<img[^>]*\ssrc=/)
    })

    it('should allow images through media proxy when allowImages is true', () => {
      const htmlWithImages = `
        <div>
          <img src="https://example.com/photo.png" alt="Photo" />
        </div>
      `
      
      const sanitized = sanitizeEmailHtml(htmlWithImages, { 
        allowImages: true,
        mediaProxyUrl: 'http://localhost:8091/proxy'
      })
      
      // Should contain proxied URL
      expect(sanitized).toContain('src="http://localhost:8091/proxy?url=')
      expect(sanitized).toContain(encodeURIComponent('https://example.com/photo.png'))
      
      // Should still contain data-ce-src for frontend reference
      expect(sanitized).toContain('data-ce-src="https://example.com/photo.png"')
      
      // Should not be marked as blocked
      expect(sanitized).not.toContain('data-ce-blocked="true"')
    })

    it('should remove dangerous event handlers', () => {
      const maliciousHtml = `
        <div onclick="alert('click')" onmouseover="steal()">
          <p>Content</p>
          <a href="javascript:alert('xss')" onclick="hack()">Link</a>
        </div>
      `
      
      const sanitized = sanitizeEmailHtml(maliciousHtml)
      
      expect(sanitized).not.toContain('onclick=')
      expect(sanitized).not.toContain('onmouseover=')
      expect(sanitized).not.toContain('javascript:')
      expect(sanitized).not.toContain('alert(')
      expect(sanitized).not.toContain('steal(')
      expect(sanitized).not.toContain('hack(')
      expect(sanitized).toContain('Content')
    })

    it('should sanitize dangerous CSS', () => {
      const htmlWithBadCss = `
        <div style="background: url('javascript:alert(1)'); color: red; expression(alert('xss'));">
          <p style="position: fixed; @import url('evil.css');">Content</p>
        </div>
      `
      
      const sanitized = sanitizeEmailHtml(htmlWithBadCss)
      
      expect(sanitized).not.toContain('javascript:')
      expect(sanitized).not.toContain('expression(')
      expect(sanitized).not.toContain('@import')
      expect(sanitized).not.toContain('url(')
      expect(sanitized).toContain('color: red') // Safe CSS should remain
      expect(sanitized).toContain('Content')
    })

    it('should make external links safe', () => {
      const htmlWithLinks = `
        <div>
          <a href="https://example.com">Safe link</a>
          <a href="javascript:alert('xss')">Bad link</a>
          <a href="mailto:test@example.com">Email link</a>
          <a href="ftp://evil.com">FTP link</a>
        </div>
      `
      
      const sanitized = sanitizeEmailHtml(htmlWithLinks)
      
      // Safe links should have target="_blank" and rel="noopener noreferrer"
      expect(sanitized).toContain('target="_blank"')
      expect(sanitized).toContain('rel="noopener noreferrer"')
      
      // HTTPS link should be preserved
      expect(sanitized).toContain('href="https://example.com"')
      
      // Mailto should be preserved
      expect(sanitized).toContain('href="mailto:test@example.com"')
      
      // Dangerous links should be removed
      expect(sanitized).not.toContain('href="javascript:')
      expect(sanitized).not.toContain('href="ftp:')
      
      // FTP link should be stored in data attribute (javascript is completely removed by DOMPurify)
      expect(sanitized).toContain('data-ce-blocked-url="ftp://evil.com"')
    })
  })

  describe('extractPlainText', () => {
    it('should extract text content from HTML', () => {
      const html = `
        <div>
          <h1>Title</h1>
          <p>First paragraph</p>
          <script>alert('should be removed')</script>
          <style>.hidden { display: none; }</style>
          <p>Second paragraph</p>
        </div>
      `
      
      const text = extractPlainText(html)
      
      expect(text).toContain('Title')
      expect(text).toContain('First paragraph')
      expect(text).toContain('Second paragraph')
      expect(text).not.toContain('alert(')
      expect(text).not.toContain('.hidden')
    })
  })

  describe('generateEmailPreview', () => {
    it('should create preview with default length', () => {
      const html = `
        <div>
          <p>This is a very long email content that should be truncated at some point because it exceeds the maximum preview length that we want to display in the email list.</p>
        </div>
      `
      
      const preview = generateEmailPreview(html)
      
      expect(preview.length).toBeLessThanOrEqual(153) // 150 + "..."
      expect(preview).toContain('This is a very long email')
      expect(preview).toMatch(/\.\.\.$/) // Should end with "..."
    })

    it('should preserve short content as-is', () => {
      const html = '<p>Short message</p>'
      
      const preview = generateEmailPreview(html)
      
      expect(preview).toBe('Short message')
      expect(preview).not.toContain('...')
    })

    it('should customize preview length', () => {
      const html = '<p>This is a message that should be truncated</p>'
      
      const preview = generateEmailPreview(html, 20)
      
      expect(preview.length).toBeLessThanOrEqual(23) // 20 + "..."
      expect(preview).toMatch(/\.\.\.$/)
    })
  })

  describe('detectUnsafeContent', () => {
    it('should detect scripts', () => {
      const html = '<div><script>alert("xss")</script><p>Content</p></div>'
      
      const result = detectUnsafeContent(html)
      
      expect(result.hasScripts).toBe(true)
      expect(result.hasExternalImages).toBe(false)
      expect(result.hasExternalLinks).toBe(false)
      expect(result.hasDangerousAttributes).toBe(false)
    })

    it('should detect external images', () => {
      const html = '<div><img src="https://example.com/image.jpg" /><p>Content</p></div>'
      
      const result = detectUnsafeContent(html)
      
      expect(result.hasScripts).toBe(false)
      expect(result.hasExternalImages).toBe(true)
      expect(result.hasExternalLinks).toBe(false)
      expect(result.hasDangerousAttributes).toBe(false)
    })

    it('should detect external links', () => {
      const html = '<div><a href="https://example.com">Link</a><p>Content</p></div>'
      
      const result = detectUnsafeContent(html)
      
      expect(result.hasScripts).toBe(false)
      expect(result.hasExternalImages).toBe(false)
      expect(result.hasExternalLinks).toBe(true)
      expect(result.hasDangerousAttributes).toBe(false)
    })

    it('should detect dangerous attributes', () => {
      const html = '<div onclick="alert(1)"><p>Content</p></div>'
      
      const result = detectUnsafeContent(html)
      
      expect(result.hasScripts).toBe(false)
      expect(result.hasExternalImages).toBe(false)
      expect(result.hasExternalLinks).toBe(false)
      expect(result.hasDangerousAttributes).toBe(true)
    })

    it('should detect multiple threats', () => {
      const html = `
        <div onclick="hack()">
          <script>alert("xss")</script>
          <img src="https://tracker.com/pixel.gif" />
          <a href="https://phishing.com">Click here</a>
        </div>
      `
      
      const result = detectUnsafeContent(html)
      
      expect(result.hasScripts).toBe(true)
      expect(result.hasExternalImages).toBe(true)
      expect(result.hasExternalLinks).toBe(true)
      expect(result.hasDangerousAttributes).toBe(true)
    })
  })
})
