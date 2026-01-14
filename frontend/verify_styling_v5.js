const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('Step 1: Navigating to login...');
    await page.goto('http://localhost:3001/login', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    console.log('Step 2: Login...');
    await page.fill('input[id="username"]', 'admin');
    await page.fill('input[id="password"]', 'password123');
    await page.click('button:has-text("Sign in")');

    console.log('Step 3: Wait for chat page...');
    await page.waitForURL('**/chat', { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    console.log('Step 4: Click "Start New Chat"...');
    const startChatBtn = await page.$('button:has-text("Start New Chat"), button:has-text("+ New Chat")');
    if (startChatBtn) {
      await startChatBtn.click();
      await page.waitForTimeout(2000);
    }

    // Take screenshot to see the chat interface
    await page.screenshot({ path: 'chat-interface.png', fullPage: true });

    console.log('Step 5: Find message input...');
    // Look for the message input in various ways
    let messageInput = null;

    // Try different selectors
    const selectors = [
      'textarea',
      'input[placeholder*="message"]',
      'input[placeholder*="Message"]',
      'input[placeholder*="Type"]',
      'textarea[placeholder*="message"]',
      'textarea[placeholder*="Message"]',
      '[contenteditable="true"]',
    ];

    for (const selector of selectors) {
      messageInput = await page.$(selector);
      if (messageInput) {
        console.log(`Found input with selector: ${selector}`);
        break;
      }
    }

    // If still not found, list all inputs
    if (!messageInput) {
      const allInputs = await page.$$('input, textarea, [contenteditable]');
      console.log(`Found ${allInputs.length} potential inputs`);
      for (let i = 0; i < allInputs.length; i++) {
        const type = await allInputs[i].getAttribute('type');
        const placeholder = await allInputs[i].getAttribute('placeholder');
        const role = await allInputs[i].getAttribute('role');
        const contentEditable = await allInputs[i].getAttribute('contenteditable');
        console.log(`${i}: type=${type}, placeholder=${placeholder}, role=${role}, contenteditable=${contentEditable}`);
      }

      // Use the largest textarea if available
      const textareas = await page.$$('textarea');
      if (textareas.length > 0) {
        messageInput = textareas[textareas.length - 1];
        console.log('Using last textarea');
      }
    }

    if (messageInput) {
      console.log('Step 6: Type message...');
      const testMessage = 'Show me a table with 3 rows, a code block in Python, the quadratic formula as math, a blockquote, and a nested list';

      // For textarea
      await messageInput.fill(testMessage);
      console.log('Message typed');

      console.log('Step 7: Find and click send button...');
      const buttons = await page.$$('button');
      let found = false;
      for (const btn of buttons) {
        const text = await btn.textContent();
        if (text.includes('Send') || text.includes('send')) {
          await btn.click();
          console.log('Send button clicked');
          found = true;
          break;
        }
      }

      if (!found) {
        console.log('Send button not found by text, trying keyboard shortcut');
        await messageInput.press('Enter');
      }

      console.log('Step 8: Wait for response...');
      // Wait for streaming response
      for (let i = 0; i < 30; i++) {
        await page.waitForTimeout(500);
        const content = await page.content();
        if (content.includes('quadratic') || content.includes('SELECT') || content.includes('```') || content.includes('<table')) {
          console.log('Response detected!');
          break;
        }
      }

      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'response-screenshot.png', fullPage: true });

      console.log('\n=== ANALYZING RESPONSE ===\n');

      // Get all message containers
      const messages = await page.$$('[role="article"], [data-testid*="message"], .message-container, div[class*="message"]');
      console.log(`Found ${messages.length} message containers`);

      // Find the last/latest message which should be the assistant's response
      let responseContainer = null;
      for (let i = messages.length - 1; i >= 0; i--) {
        const text = await messages[i].textContent();
        if (text && text.length > 100) {  // Has substantial content
          responseContainer = messages[i];
          break;
        }
      }

      if (!responseContainer) {
        // Fallback: try to find by looking for markdown indicators
        for (const msg of messages) {
          const html = await msg.innerHTML();
          if (html.includes('<table') || html.includes('```') || html.includes('blockquote') || html.includes('.katex')) {
            responseContainer = msg;
            break;
          }
        }
      }

      if (responseContainer) {
        const html = await responseContainer.innerHTML();
        fs.writeFileSync('response-html.txt', html);

        console.log('=== STYLING VERIFICATION RESULTS ===\n');

        // Table check
        const tableElement = await responseContainer.$('table');
        console.log(`✓ Table rendered: ${tableElement ? 'YES ✓' : 'NO ✗'}`);
        if (tableElement) {
          const rows = await responseContainer.$$('tbody tr');
          const headerRows = await responseContainer.$$('thead tr');
          console.log(`  - Header rows: ${headerRows.length}`);
          console.log(`  - Body rows: ${rows.length}`);
        }

        // Code block check
        const codeElement = await responseContainer.$('pre code');
        console.log(`✓ Code block: ${codeElement ? 'YES ✓' : 'NO ✗'}`);
        if (codeElement) {
          const codeClass = await codeElement.getAttribute('class');
          const hasLanguage = codeClass?.includes('language-') || codeClass?.includes('hljs');
          console.log(`  - Syntax highlighting: ${hasLanguage ? 'YES ✓' : 'NO ✗'}`);
          console.log(`  - Class: ${codeClass || 'none'}`);
        }

        // Math formula check
        const mathDisplay = await responseContainer.$('.katex-display');
        const mathInline = await responseContainer.$('.katex');
        const mathJax = await responseContainer.$('script[type*="math"]');
        const mathSpan = await responseContainer.$('span[class*="math"], div[class*="math"]');

        const hasMath = mathDisplay || mathInline || mathJax || mathSpan;
        console.log(`✓ Math formula: ${hasMath ? 'YES ✓' : 'NO ✗'}`);
        if (mathDisplay) console.log('  - KaTeX display: YES');
        if (mathInline) console.log('  - KaTeX inline: YES');
        if (mathSpan) console.log('  - Math span: YES');

        // Blockquote check
        const blockquote = await responseContainer.$('blockquote');
        console.log(`✓ Blockquote: ${blockquote ? 'YES ✓' : 'NO ✗'}`);
        if (blockquote) {
          const borderStyle = await blockquote.evaluate((el) => {
            const s = window.getComputedStyle(el);
            return s.borderLeft || s.borderLeftColor || 'none';
          });
          console.log(`  - Border: ${borderStyle}`);
        }

        // Lists check
        const uls = await responseContainer.$$('ul');
        const ols = await responseContainer.$$('ol');
        console.log(`✓ Lists found: ${uls.length + ols.length} (UL: ${uls.length}, OL: ${ols.length})`);

        // Nested lists check
        const nestedLists = await responseContainer.$$('ul ul, ul ol, ol ul, ol ol');
        console.log(`✓ Nested lists: ${nestedLists.length > 0 ? 'YES ✓' : 'NO ✗'}`);

        // Check list structure
        if (uls.length > 0 || ols.length > 0) {
          const allLists = [...uls, ...ols];
          for (let i = 0; i < Math.min(2, allLists.length); i++) {
            const items = await allLists[i].$$(':scope > li');
            console.log(`  - List ${i + 1}: ${items.length} items`);
          }
        }

        console.log('\n=== MARKDOWN ELEMENTS ===\n');
        const strong = await responseContainer.$$('strong, b');
        const em = await responseContainer.$$('em, i');
        const headings = await responseContainer.$$('h1, h2, h3, h4, h5, h6');
        const links = await responseContainer.$$('a');
        console.log(`- Bold elements: ${strong.length}`);
        console.log(`- Italic elements: ${em.length}`);
        console.log(`- Headings: ${headings.length}`);
        console.log(`- Links: ${links.length}`);

        console.log('\n=== SUMMARY ===');
        console.log('Saved files:');
        console.log('  - response-screenshot.png (visual check)');
        console.log('  - response-html.txt (HTML content)');
        console.log('  - chat-interface.png (interface check)');
      } else {
        console.log('ERROR: Could not find response container');
        const pageContent = await page.content();
        if (pageContent.includes('error') || pageContent.includes('Error')) {
          console.log('Page contains error messages');
        }
      }
    } else {
      console.log('ERROR: Message input not found');
    }

  } catch (error) {
    console.error('\nError:', error.message);
    try {
      await page.screenshot({ path: 'error-screenshot.png', fullPage: true });
      console.log('Error screenshot saved');
    } catch (e) {}
  } finally {
    await browser.close();
  }
})();
