const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('Step 1: Opening chat page directly...');
    await page.goto('http://localhost:3001/chat', { waitUntil: 'load' });

    // Wait a moment for any redirects
    await page.waitForTimeout(1000);
    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);

    // If we're on login page, attempt login
    if (currentUrl.includes('login')) {
      console.log('\nStep 2: On login page, attempting authentication...');

      // Take screenshot of login page
      await page.screenshot({ path: 'login-page.png' });

      // Try to find and fill form fields
      const usernameInput = await page.$('input[id="username"]');
      const passwordInput = await page.$('input[id="password"]');

      if (usernameInput && passwordInput) {
        await usernameInput.fill('admin');
        await passwordInput.fill('password123');

        // Take screenshot before clicking
        await page.screenshot({ path: 'login-filled.png' });

        // Click sign in button
        const signInBtn = await page.$('button:has-text("Sign in")');
        if (signInBtn) {
          await signInBtn.click();
          console.log('Clicked Sign in button');

          // Wait for navigation
          await page.waitForTimeout(3000);
          console.log('After login, URL:', page.url());
        }
      }
    }

    // Now try to access chat
    if (page.url().includes('login')) {
      console.log('Still on login page, trying direct navigation...');
      // Try to navigate directly after failed login
      await page.goto('http://localhost:3001/chat', { waitUntil: 'load' });
    }

    await page.waitForLoadState('networkidle');

    // Look for the chat interface
    console.log('\nStep 3: Looking for chat interface...');

    // Take a screenshot to see what's on screen
    await page.screenshot({ path: 'chat-page-start.png' });

    // Try to find message input by various selectors
    let messageInput = await page.$('input[placeholder*="message"]');
    if (!messageInput) {
      messageInput = await page.$('textarea');
    }
    if (!messageInput) {
      messageInput = await page.$('input[type="text"]:last-child');
    }

    if (messageInput) {
      console.log('Found message input!');

      const testMessage = 'Show me a table with 3 rows, a code block in Python, the quadratic formula as math, a blockquote, and a nested list';
      await messageInput.fill(testMessage);
      console.log('Message typed');

      // Find and click send button
      const buttons = await page.$$('button');
      for (const btn of buttons) {
        const text = await btn.textContent();
        if (text.includes('Send')) {
          await btn.click();
          console.log('Send button clicked');
          break;
        }
      }

      // Wait for response
      console.log('Waiting for response...');
      await page.waitForTimeout(5000); // Give it time to stream response

      // Take screenshot
      await page.screenshot({ path: 'response-screenshot.png', fullPage: true });

      // Get assistant message
      const assistantMsg = await page.$('[data-testid="assistant-message"]');
      if (assistantMsg) {
        const htmlContent = await assistantMsg.innerHTML();
        fs.writeFileSync('response-html.txt', htmlContent);

        console.log('\n=== STYLING VERIFICATION RESULTS ===\n');

        // Check for table
        const tableExists = await assistantMsg.$('table') !== null;
        console.log(`✓ Table element found: ${tableExists ? 'YES' : 'NO'}`);

        // Check for code block
        const codeExists = await assistantMsg.$('pre code') !== null;
        console.log(`✓ Code block found: ${codeExists ? 'YES' : 'NO'}`);

        // Check for math (KaTeX)
        const mathExists = await assistantMsg.$('.katex-display, .katex, span[class*="math"]') !== null;
        console.log(`✓ Math formula rendered: ${mathExists ? 'YES' : 'NO'}`);

        // Check for blockquote
        const blockquoteExists = await assistantMsg.$('blockquote') !== null;
        console.log(`✓ Blockquote found: ${blockquoteExists ? 'YES' : 'NO'}`);

        // Check for lists
        const listExists = await assistantMsg.$('ul, ol') !== null;
        console.log(`✓ Lists found: ${listExists ? 'YES' : 'NO'}`);

        // Check for nested lists
        const nestedListExists = await assistantMsg.$('ul ul, ul ol, ol ul, ol ol') !== null;
        console.log(`✓ Nested lists found: ${nestedListExists ? 'YES' : 'NO'}`);

        console.log('\n=== END VERIFICATION ===\n');
        console.log('Saved files:');
        console.log('  - response-screenshot.png');
        console.log('  - response-html.txt');
      } else {
        console.log('ERROR: Assistant message not found');
        console.log('Looking for all message elements...');
        const allMessages = await page.$$('[data-testid*="message"]');
        console.log(`Found ${allMessages.length} message elements`);
      }
    } else {
      console.log('ERROR: Could not find message input field');
      const allInputs = await page.$$('input, textarea');
      console.log(`Found ${allInputs.length} input/textarea elements`);
      for (let i = 0; i < allInputs.length; i++) {
        const type = await allInputs[i].getAttribute('type');
        const placeholder = await allInputs[i].getAttribute('placeholder');
        const id = await allInputs[i].getAttribute('id');
        console.log(`  ${i}: type=${type}, placeholder=${placeholder}, id=${id}`);
      }
    }

  } catch (error) {
    console.error('Error during test:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await browser.close();
  }
})();
