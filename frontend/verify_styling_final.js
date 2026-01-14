const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('Step 1: Navigating to login page...');
    await page.goto('http://localhost:3001/login', { waitUntil: 'networkidle' });

    console.log('Step 2: Filling login credentials...');
    const usernameInput = await page.$('input[id="username"]');
    const passwordInput = await page.$('input[id="password"]');

    if (usernameInput && passwordInput) {
      await usernameInput.fill('admin');
      await passwordInput.fill('password123');

      console.log('Step 3: Clicking Sign in button...');
      const signInBtn = await page.$('button:has-text("Sign in")');
      if (signInBtn) {
        await signInBtn.click();

        console.log('Step 4: Waiting for redirect to chat page...');
        await page.waitForURL('**/chat', { timeout: 5000 });
        await page.waitForLoadState('networkidle');
        console.log('Successfully logged in and redirected to chat!');
      }
    }

    console.log('\nStep 5: Sending test message...');
    const messageInput = await page.$('input[placeholder*="message"], textarea');

    if (messageInput) {
      const testMessage = 'Show me a table with 3 rows, a code block in Python, the quadratic formula as math, a blockquote, and a nested list';
      await messageInput.fill(testMessage);

      // Click send button
      const buttons = await page.$$('button');
      for (const btn of buttons) {
        const text = await btn.textContent();
        if (text.includes('Send')) {
          await btn.click();
          console.log('Message sent!');
          break;
        }
      }

      console.log('Step 6: Waiting for LLM response...');
      // Wait for the response to appear
      await page.waitForTimeout(3000);

      // Keep checking for assistant message
      let assistantMsg = null;
      for (let i = 0; i < 20; i++) {
        assistantMsg = await page.$('[data-testid="assistant-message"]');
        if (assistantMsg) {
          console.log('Response received!');
          break;
        }
        await page.waitForTimeout(500);
      }

      if (!assistantMsg) {
        console.log('ERROR: Could not find assistant message');
        console.log('Checking page content...');
        const allMessages = await page.$$('[data-testid*="message"]');
        console.log(`Found ${allMessages.length} message elements with data-testid`);

        // Try to find any content that looks like a response
        const content = await page.content();
        if (content.includes('quadratic') || content.includes('```')) {
          console.log('Found response content in page!');
        }
      }

      console.log('\nStep 7: Taking screenshot...');
      await page.screenshot({ path: 'response-screenshot.png', fullPage: true });

      console.log('Step 8: Analyzing response styling...');

      // Get all message containers
      const messages = await page.$$('[role="article"], [data-testid*="message"], .message, [class*="message"]');
      console.log(`Found ${messages.length} potential message containers`);

      // Find the assistant's message (usually the last one or marked with role)
      let responseContent = null;
      for (const msg of messages) {
        const text = await msg.textContent();
        if (text && (text.includes('quadratic') || text.includes('python') || text.includes('SELECT'))) {
          responseContent = msg;
          console.log('Found response content!');
          break;
        }
      }

      if (!responseContent && assistantMsg) {
        responseContent = assistantMsg;
      }

      if (responseContent) {
        const htmlContent = await responseContent.innerHTML();
        fs.writeFileSync('response-html.txt', htmlContent);

        console.log('\n=== STYLING VERIFICATION RESULTS ===\n');

        // Check for table
        const tableElement = await responseContent.$('table');
        console.log(`✓ Table element found: ${tableElement ? 'YES' : 'NO'}`);
        if (tableElement) {
          const rows = await responseContent.$$('tbody tr');
          console.log(`  - Table rows: ${rows.length}`);
          const cells = await responseContent.$$('td');
          console.log(`  - Table cells: ${cells.length}`);
        }

        // Check for code block
        const codeElement = await responseContent.$('pre code');
        console.log(`✓ Code block found: ${codeElement ? 'YES' : 'NO'}`);
        if (codeElement) {
          const codeClass = await codeElement.getAttribute('class');
          console.log(`  - Class: ${codeClass || 'none'}`);
          console.log(`  - Has language class: ${codeClass?.includes('language-') ? 'YES' : 'NO'}`);

          // Check for syntax highlighting (look for span elements with class)
          const spans = await responseContent.$$('pre code span');
          console.log(`  - Syntax highlighting spans: ${spans.length}`);
        }

        // Check for math formula (KaTeX)
        const mathDisplay = await responseContent.$('.katex-display');
        const mathInline = await responseContent.$('.katex');
        const mathScript = await responseContent.$('script[type*="math"]');
        const mathSpan = await responseContent.$('span[class*="math"]');

        const mathExists = mathDisplay || mathInline || mathScript || mathSpan;
        console.log(`✓ Math formula rendered: ${mathExists ? 'YES' : 'NO'}`);
        if (mathDisplay) console.log(`  - KaTeX display: YES`);
        if (mathInline) console.log(`  - KaTeX inline: YES`);
        if (mathScript) console.log(`  - Math script: YES`);

        // Check for blockquote
        const blockquoteElement = await responseContent.$('blockquote');
        console.log(`✓ Blockquote found: ${blockquoteElement ? 'YES' : 'NO'}`);
        if (blockquoteElement) {
          const style = await blockquoteElement.evaluate((el) => {
            const s = window.getComputedStyle(el);
            return {
              borderLeft: s.borderLeft,
              borderLeftColor: s.borderLeftColor,
              borderLeftWidth: s.borderLeftWidth,
              paddingLeft: s.paddingLeft,
            };
          });
          console.log(`  - Border styling:`, style.borderLeft);
          console.log(`  - Has visible border: ${style.borderLeftWidth !== '0px' ? 'YES' : 'NO'}`);
        }

        // Check for lists
        const ulElements = await responseContent.$$('ul');
        const olElements = await responseContent.$$('ol');
        console.log(`✓ Unordered lists found: ${ulElements.length}`);
        console.log(`✓ Ordered lists found: ${olElements.length}`);

        // Check for nested lists
        const nestedLists = await responseContent.$$('ul ul, ul ol, ol ul, ol ol');
        console.log(`✓ Nested lists found: ${nestedLists.length > 0 ? 'YES' : 'NO'}`);

        if (ulElements.length > 0 || olElements.length > 0) {
          // Get list structure
          const listItems = await responseContent.$$('li');
          console.log(`  - Total list items: ${listItems.length}`);

          // Check for proper indentation
          for (let i = 0; i < Math.min(3, ulElements.length); i++) {
            const ul = ulElements[i];
            const children = await ul.$$(':scope > li');
            console.log(`  - List ${i + 1} items: ${children.length}`);
          }
        }

        console.log('\n=== Markdown Elements Check ===');
        // Look for common markdown patterns
        const strongElements = await responseContent.$$('strong, b');
        console.log(`✓ Bold elements: ${strongElements.length}`);

        const emElements = await responseContent.$$('em, i');
        console.log(`✓ Italic elements: ${emElements.length}`);

        const headings = await responseContent.$$('h1, h2, h3, h4, h5, h6');
        console.log(`✓ Headings: ${headings.length}`);

        const links = await responseContent.$$('a');
        console.log(`✓ Links: ${links.length}`);

        console.log('\n=== END VERIFICATION ===\n');
        console.log('Saved files:');
        console.log('  - response-screenshot.png');
        console.log('  - response-html.txt');
      } else {
        console.log('ERROR: Could not find response content to verify');
      }
    } else {
      console.log('ERROR: Could not find message input field');
    }

  } catch (error) {
    console.error('Error during test:', error.message);
    // Still take a screenshot for debugging
    try {
      await page.screenshot({ path: 'error-screenshot.png', fullPage: true });
      console.log('Error screenshot saved to error-screenshot.png');
    } catch (e) {}
  } finally {
    await browser.close();
  }
})();
