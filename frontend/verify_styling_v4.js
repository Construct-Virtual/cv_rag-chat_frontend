const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('Step 1: Waiting for frontend to be ready...');
    await page.goto('http://localhost:3001/login', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000); // Give it time to compile

    console.log('Step 2: Filling login credentials...');
    const usernameInput = await page.$('input[id="username"]');
    const passwordInput = await page.$('input[id="password"]');

    if (usernameInput && passwordInput) {
      await usernameInput.fill('admin');
      await passwordInput.fill('password123');

      console.log('Step 3: Clicking Sign in button...');
      const signInBtn = await page.$('button');
      if (signInBtn) {
        const btnText = await signInBtn.textContent();
        console.log(`Button text: "${btnText}"`);
        await signInBtn.click();

        console.log('Step 4: Waiting for redirect...');
        // Wait longer for login to process
        await page.waitForTimeout(5000);
        const currentUrl = page.url();
        console.log(`Current URL: ${currentUrl}`);

        if (currentUrl.includes('/chat')) {
          console.log('Successfully logged in!');
          await page.waitForLoadState('networkidle');
        } else if (currentUrl.includes('/login')) {
          console.log('Still on login page, checking for errors...');
          const errorMsg = await page.$('[role="alert"]');
          if (errorMsg) {
            const errorText = await errorMsg.textContent();
            console.log(`Error: ${errorText}`);
          }
          console.log('Trying to navigate directly to chat...');
          await page.goto('http://localhost:3001/chat', { waitUntil: 'networkidle' });
        }
      }
    }

    console.log('\nStep 5: Sending test message...');
    let messageInput = await page.$('input[placeholder*="message"], textarea, input[type="text"]');

    if (!messageInput) {
      const allInputs = await page.$$('input, textarea');
      console.log(`Found ${allInputs.length} inputs`);
      for (let i = 0; i < allInputs.length; i++) {
        const placeholder = await allInputs[i].getAttribute('placeholder');
        const type = await allInputs[i].getAttribute('type');
        console.log(`Input ${i}: type=${type}, placeholder=${placeholder}`);
        if (placeholder && placeholder.includes('message')) {
          messageInput = allInputs[i];
          break;
        }
      }
    }

    if (messageInput) {
      const testMessage = 'Show me a table with 3 rows, a code block in Python, the quadratic formula as math, a blockquote, and a nested list';
      await messageInput.fill(testMessage);
      console.log('Message typed');

      // Click send button
      const buttons = await page.$$('button');
      for (const btn of buttons) {
        const text = await btn.textContent();
        if (text.includes('Send')) {
          await btn.click();
          console.log('Send button clicked');
          break;
        }
      }

      console.log('Step 6: Waiting for LLM response (this may take a moment)...');
      await page.waitForTimeout(5000);

      // Screenshot before looking
      await page.screenshot({ path: 'chat-page.png', fullPage: true });

      // Get the main content area
      const chatContainer = await page.$('[role="main"], .chat-container, main, [class*="chat"]');
      if (chatContainer) {
        const htmlContent = await chatContainer.innerHTML();
        fs.writeFileSync('chat-content-html.txt', htmlContent);
      }

      // Look for any response content
      const content = await page.content();
      if (content.includes('<table') || content.includes('quadratic') || content.includes('```')) {
        console.log('Response content detected!');

        // Take full screenshot
        await page.screenshot({ path: 'response-screenshot.png', fullPage: true });

        // Get all article or message containers
        const containers = await page.$$('[role="article"], [data-testid*="message"], .message');
        console.log(`Found ${containers.length} message containers`);

        let responseContent = null;

        // Look for container with our test content
        for (const container of containers) {
          const text = await container.textContent();
          if (text && (text.includes('table') || text.includes('Python') || text.includes('quadratic') || text.includes('blockquote'))) {
            responseContent = container;
            console.log('Found response content!');
            break;
          }
        }

        if (responseContent) {
          const htmlContent = await responseContent.innerHTML();
          fs.writeFileSync('response-html.txt', htmlContent);

          console.log('\n=== STYLING VERIFICATION RESULTS ===\n');

          // Check for table
          const tableElement = await responseContent.$('table');
          console.log(`✓ Table element: ${tableElement ? 'YES' : 'NO'}`);
          if (tableElement) {
            const rows = await responseContent.$$('tbody tr, tr');
            console.log(`  - Rows: ${rows.length}`);
          }

          // Check for code block
          const codeElement = await responseContent.$('pre code, code');
          console.log(`✓ Code block: ${codeElement ? 'YES' : 'NO'}`);
          if (codeElement) {
            const codeClass = await codeElement.getAttribute('class');
            console.log(`  - Has language class: ${codeClass?.includes('language-') ? 'YES' : 'NO'}`);
          }

          // Check for math
          const mathDisplay = await responseContent.$('.katex-display');
          const mathInline = await responseContent.$('.katex');
          console.log(`✓ Math formula: ${mathDisplay || mathInline ? 'YES' : 'NO'}`);

          // Check for blockquote
          const blockquote = await responseContent.$('blockquote');
          console.log(`✓ Blockquote: ${blockquote ? 'YES' : 'NO'}`);
          if (blockquote) {
            const style = await blockquote.evaluate((el) => window.getComputedStyle(el).borderLeft);
            console.log(`  - Has border: ${style && style !== 'none' ? 'YES' : 'NO'}`);
          }

          // Check for lists
          const lists = await responseContent.$$('ul, ol');
          console.log(`✓ Lists: ${lists.length}`);

          const nested = await responseContent.$$('ul ul, ul ol, ol ul, ol ol');
          console.log(`✓ Nested lists: ${nested.length > 0 ? 'YES' : 'NO'}`);

          console.log('\n=== END VERIFICATION ===\n');
          console.log('Saved files:');
          console.log('  - response-screenshot.png');
          console.log('  - response-html.txt');
        }
      } else {
        console.log('No response content found yet, showing page...');
        await page.screenshot({ path: 'no-response-screenshot.png', fullPage: true });
        console.log('Saved to: no-response-screenshot.png');
      }
    } else {
      console.log('ERROR: Could not find message input');
      await page.screenshot({ path: 'input-error.png', fullPage: true });
    }

  } catch (error) {
    console.error('Error:', error.message);
    try {
      await page.screenshot({ path: 'crash-screenshot.png', fullPage: true });
    } catch (e) {}
  } finally {
    await browser.close();
  }
})();
