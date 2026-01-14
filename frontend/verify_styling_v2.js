const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('Navigating to login page...');
    await page.goto('http://localhost:3001/login', { waitUntil: 'networkidle' });

    console.log('Current URL:', page.url());
    console.log('Logging in with admin/password123...');

    // Get all input fields
    const inputs = await page.$$('input');
    console.log(`Found ${inputs.length} input fields`);

    for (let i = 0; i < inputs.length; i++) {
      const type = await inputs[i].getAttribute('type');
      const id = await inputs[i].getAttribute('id');
      const placeholder = await inputs[i].getAttribute('placeholder');
      console.log(`Input ${i}: type=${type}, id=${id}, placeholder=${placeholder}`);
    }

    // Try to fill the inputs
    const allInputs = await page.$$('input');
    if (allInputs.length >= 2) {
      await allInputs[0].fill('admin');
      await allInputs[1].fill('password123');
    }

    // Find and click the submit button
    const buttons = await page.$$('button');
    console.log(`Found ${buttons.length} buttons`);

    for (const btn of buttons) {
      const text = await btn.textContent();
      console.log(`Button: "${text}"`);
      if (text.includes('Sign in') || text.includes('Login') || text.includes('Submit')) {
        console.log('Clicking button:', text);
        await btn.click();
        break;
      }
    }

    // Wait a bit and check the result
    await page.waitForTimeout(2000);
    console.log('Current URL after login:', page.url());

    // If we're not on chat page, try navigating directly
    if (!page.url().includes('chat')) {
      console.log('Navigating directly to chat page...');
      await page.goto('http://localhost:3001/chat', { waitUntil: 'networkidle' });
    }

    console.log('Final URL:', page.url());
    await page.waitForLoadState('networkidle');

    console.log('Looking for message input...');
    const messageInput = await page.$('input[placeholder="Type your message..."]');
    if (!messageInput) {
      console.log('Message input not found, trying to find any textarea or input...');
      const allInputs = await page.$$('input, textarea');
      console.log(`Found ${allInputs.length} inputs/textareas`);
    } else {
      console.log('Sending test message...');
      const testMessage = 'Show me a table with 3 rows, a code block in Python, the quadratic formula as math, a blockquote, and a nested list';
      await messageInput.fill(testMessage);

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
      await page.waitForTimeout(2000);

      console.log('Taking screenshot...');
      await page.screenshot({ path: 'response-screenshot.png', fullPage: true });

      console.log('\n=== STYLING VERIFICATION RESULTS ===\n');

      const responseContent = await page.locator('[data-testid="assistant-message"]').first();

      // Check for table
      const tableCount = await responseContent.locator('table').count();
      console.log(`✓ Table element found: ${tableCount > 0 ? 'YES' : 'NO'}`);

      // Check for code block
      const codeCount = await responseContent.locator('pre code').count();
      console.log(`✓ Code block found: ${codeCount > 0 ? 'YES' : 'NO'}`);

      // Check for math formula
      const mathCount = await responseContent.locator('.katex-display, .katex, span[class*="math"]').count();
      console.log(`✓ Math formula rendered: ${mathCount > 0 ? 'YES' : 'NO'}`);

      // Check for blockquote
      const blockquoteCount = await responseContent.locator('blockquote').count();
      console.log(`✓ Blockquote found: ${blockquoteCount > 0 ? 'YES' : 'NO'}`);

      // Check for lists
      const lists = await responseContent.locator('ul, ol').count();
      console.log(`✓ Lists found: ${lists}`);

      const nestedLists = await responseContent.locator('ul ul, ul ol, ol ul, ol ol').count();
      console.log(`✓ Nested lists found: ${nestedLists > 0 ? 'YES' : 'NO'}`);

      console.log('\n=== END VERIFICATION ===\n');
      console.log('Screenshot saved to: response-screenshot.png');
    }

  } catch (error) {
    console.error('Error during test:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await browser.close();
  }
})();
