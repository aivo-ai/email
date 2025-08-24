import { chromium } from 'playwright'

async function checkSecurityHeaders() {
  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()

  const requiredHeaders = [
    'x-frame-options',
    'x-content-type-options',
    'x-xss-protection',
    'strict-transport-security',
    'content-security-policy'
  ]

  try {
    const response = await page.goto('http://localhost:5173')
    const headers = response.headers()

    const missingHeaders = requiredHeaders.filter(header => !headers[header])

    if (missingHeaders.length > 0) {
      console.error('❌ Missing security headers:', missingHeaders)
      process.exit(1)
    }

    console.log('✅ All required security headers present')
  } catch (error) {
    console.error('❌ Security header check failed:', error.message)
    process.exit(1)
  } finally {
    await browser.close()
  }
}

checkSecurityHeaders()
