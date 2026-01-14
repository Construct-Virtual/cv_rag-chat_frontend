const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('Navigating to login page...');
    await page.goto('http://localhost:3001/login', { waitUntil: 'networkidle' });

    console.log('Logging in with admin/password123...');
    await page.fill('input[type="text"]', 'admin');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button');

    console.log('Waiting for redirect to chat page...');
    await page.waitForURL('**/chat', { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    console.log('Sending test message...');
    const testMessage = 'Show me a table with 3 rows, a code block in Python, the quadratic formula as math, a blockquote, and a nested list';
    await page.fill('input[placeholder="Type your message..."]', testMessage);

    // Click send button
    const buttons = await page.$$('button');
    for (const btn of buttons) {
      const text = await btn.textContent();
      if (text.includes('Send')) {
        await btn.click();
        break;
      }
    }

    console.log('Waiting for response...');
    await page.waitForSelector('[data-testid="assistant-message"]', { timeout: 30000 });
    await page.waitForTimeout(2000); // Give it a moment to render

    console.log('Taking screenshot...');
    await page.screenshot({ path: 'response-screenshot.png', fullPage: true });

    console.log('\n=== STYLING VERIFICATION RESULTS ===\n');

    const responseContent = await page.locator('[data-testid="assistant-message"]').first();

    // Check for table
    const tableCount = await responseContent.locator('table').count();
    console.log(`✓ Table element found: ${tableCount > 0 ? 'YES' : 'NO'}`);
    if (tableCount > 0) {
      const rows = await responseContent.locator('tbody tr').count();
      console.log(`  - Table rows: ${rows}`);
    }

    // Check for code block
    const codeCount = await responseContent.locator('pre code').count();
    console.log(`✓ Code block found: ${codeCount > 0 ? 'YES' : 'NO'}`);
    if (codeCount > 0) {
      const codeClass = await responseContent.locator('pre code').first().getAttribute('class');
      console.log(`  - Has syntax highlighting class: ${codeClass?.includes('language-') ? 'YES' : 'NO'}`);
      console.log(`  - Class: ${codeClass || 'none'}`);
    }

    // Check for math formula (KaTeX renders as span.katex-display)
    const mathCount = await responseContent.locator('.katex-display, .katex, span[class*="math"]').count();
    console.log(`✓ Math formula rendered: ${mathCount > 0 ? 'YES' : 'NO'}`);
    if (mathCount > 0) {
      console.log(`  - Math elements found: ${mathCount}`);
    }

    // Check for blockquote
    const blockquoteCount = await responseContent.locator('blockquote').count();
    console.log(`✓ Blockquote found: ${blockquoteCount > 0 ? 'YES' : 'NO'}`);
    if (blockquoteCount > 0) {
      const borderStyle = await responseContent.locator('blockquote').first().evaluate((el) => {
        const style = window.getComputedStyle(el);
        return `${style.borderLeft || style.borderLeftColor}`;
      });
      console.log(`  - Has border styling: ${borderStyle ? 'YES' : 'NO'}`);
    }

    // Check for nested lists
    const lists = await responseContent.locator('ul, ol').count();
    console.log(`✓ Lists found: ${lists}`);

    const nestedLists = await responseContent.locator('ul ul, ul ol, ol ul, ol ol').count();
    console.log(`✓ Nested lists found: ${nestedLists > 0 ? 'YES' : 'NO'}`);

    // Get raw HTML to inspect
    const htmlContent = await responseContent.innerHTML();
    const htmlFile = 'response-html.txt';
    fs.writeFileSync(htmlFile, htmlContent);
    console.log(`\nHTML content saved to: ${htmlFile}`);

    console.log('\n=== END VERIFICATION ===\n');
    console.log('Screenshot saved to: response-screenshot.png');

  } catch (error) {
    console.error('Error during test:', error.message);
  } finally {
    await browser.close();
  }
})();
