import { chromium } from 'playwright'
import { injectAxe, checkA11y } from 'axe-playwright'

async function runA11yTests() {
  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    // Test webmail
    await page.goto('http://localhost:5173')
    await injectAxe(page)
    await checkA11y(page, null, {
      detailedReport: true,
      detailedReportOptions: { html: true },
    })

    // Test admin console
    await page.goto('http://localhost:5174')
    await injectAxe(page)
    await checkA11y(page, null, {
      detailedReport: true,
      detailedReportOptions: { html: true },
    })

    console.log('✅ All accessibility tests passed')
  } catch (error) {
    console.error('❌ Accessibility tests failed:', error.message)
    process.exit(1)
  } finally {
    await browser.close()
  }
}

runA11yTests()
