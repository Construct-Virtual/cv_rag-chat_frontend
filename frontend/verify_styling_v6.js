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

    console.log('Step 2: Logging in...');
    await page.fill('input[id="username"]', 'admin');
    await page.fill('input[id="password"]', 'password123');
    await page.click('button:has-text("Sign in")');

    console.log('Step 3: Waiting for redirect...');
    await page.waitForURL('**/chat', { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    // Wait a bit for page to fully render
    await page.waitForTimeout(2000);

    console.log('Step 4: Checking page structure...');
    const content = await page.content();

    // Look for message input or start new chat functionality
    const hasMessageInput = content.includes('placeholder') && (
      content.includes('Type your message') ||
      content.includes('message') ||
      content.includes('textarea')
    );

    console.log(`Has message input indicators: ${hasMessageInput}`);

    // Try to find and click the "Start New Chat" button more directly
    const allButtons = await page.$$('button');
    console.log(`Found ${allButtons.length} buttons on page`);

    let startChatButton = null;
    for (const btn of allButtons) {
      const text = await btn.textContent();
      console.log(`Button: "${text.trim()}"`);
      if (text.includes('Start New Chat') || text.includes('New Chat') || text.includes('+ New')) {
        startChatButton = btn;
        break;
      }
    }

    if (startChatButton) {
      console.log('\nFound "Start New Chat" button, clicking...');
      await startChatButton.click();
      await page.waitForTimeout(3000);
    } else {
      console.log('\n"Start New Chat" button not found, trying alternative approach...');
      // Maybe we need to make an API call to create a conversation
      console.log('Attempting to create conversation via API...');
      const createConvResponse = await page.evaluate(async () => {
        try {
          const token = sessionStorage.getItem('access_token');
          const response = await fetch('http://localhost:8001/api/chat/conversations', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ title: 'Test Conversation' })
          });
          const data = await response.json();
          return data;
        } catch (e) {
          return { error: e.message };
        }
      });

      console.log('API Response:', createConvResponse);

      if (createConvResponse.id) {
        console.log(`Created conversation: ${createConvResponse.id}`);
        // Reload page to see the new conversation
        await page.reload();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
      }
    }

    // Take a screenshot to see current state
    await page.screenshot({ path: 'chat-state-2.png', fullPage: true });

    console.log('\nStep 5: Looking for message input...');
    // Look for textarea or input field
    const textareas = await page.$$('textarea');
    const inputs = await page.$$('input[type="text"]');
    const contentEditables = await page.$$('[contenteditable="true"]');

    console.log(`- Textareas: ${textareas.length}`);
    console.log(`- Text inputs: ${inputs.length}`);
    console.log(`- Contenteditable: ${contentEditables.length}`);

    let messageInput = textareas[0] || inputs[inputs.length - 1] || contentEditables[0];

    if (!messageInput) {
      console.log('Trying to find by role...');
      const inputsByRole = await page.$$('[role="textbox"]');
      console.log(`- Elements with role="textbox": ${inputsByRole.length}`);
      messageInput = inputsByRole[0];
    }

    if (messageInput) {
      console.log('Found message input! Sending test message...');
      const testMessage = 'Show me a table with 3 rows, a code block in Python, the quadratic formula as math, a blockquote, and a nested list';

      // Type the message
      await messageInput.fill(testMessage);
      await page.waitForTimeout(1000);

      // Try to send with keyboard
      await messageInput.press('Enter');
      console.log('Message sent (Enter key)');

      // If that doesn't work, find send button
      const allButtons = await page.$$('button');
      for (const btn of allButtons) {
        const text = await btn.textContent();
        if (text && text.includes('Send')) {
          await btn.click();
          console.log('Message sent (Send button)');
          break;
        }
      }

      // Wait for response
      console.log('Step 6: Waiting for response (30 seconds)...');
      for (let i = 0; i < 60; i++) {
        await page.waitForTimeout(500);
        const pageContent = await page.content();
        if (
          pageContent.includes('<table') ||
          pageContent.includes('quadratic') ||
          pageContent.includes('```python') ||
          pageContent.includes('def ') ||
          pageContent.includes('<blockquote')
        ) {
          console.log('Response detected!');
          break;
        }
      }

      // Final screenshot
      await page.screenshot({ path: 'response-screenshot.png', fullPage: true });

      console.log('\nStep 7: Analyzing response...');

      // Get all potential message containers
      const articles = await page.$$('[role="article"]');
      const messageImpls = await page.$$('[data-testid*="message"]');
      const messageClasses = await page.$$('[class*="message"]');

      console.log(`Articles: ${articles.length}`);
      console.log(`Message containers: ${messageImpls.length}`);
      console.log(`Message classes: ${messageClasses.length}`);

      // Find the response (usually the last article or message)
      let responseElement = null;
      if (articles.length > 0) {
        responseElement = articles[articles.length - 1];
      } else if (messageClasses.length > 0) {
        responseElement = messageClasses[messageClasses.length - 1];
      }

      if (responseElement) {
        const html = await responseElement.innerHTML();
        fs.writeFileSync('response-html.txt', html);
        console.log('\nHTML saved to response-html.txt');

        console.log('\n=== STYLING VERIFICATION RESULTS ===\n');

        // Table
        const table = await responseElement.$('table');
        console.log(`✓ Table: ${table ? 'YES ✓' : 'NO ✗'}`);

        // Code
        const code = await responseElement.$('pre code, code');
        console.log(`✓ Code block: ${code ? 'YES ✓' : 'NO ✗'}`);

        // Math
        const math = await responseElement.$('.katex, .katex-display, span[class*="math"]');
        console.log(`✓ Math: ${math ? 'YES ✓' : 'NO ✗'}`);

        // Blockquote
        const blockquote = await responseElement.$('blockquote');
        console.log(`✓ Blockquote: ${blockquote ? 'YES ✓' : 'NO ✗'}`);

        // Lists
        const lists = await responseElement.$$('ul, ol');
        console.log(`✓ Lists: ${lists.length} (${lists.length > 0 ? 'YES ✓' : 'NO ✗'})`);

        const nestedLists = await responseElement.$$('ul ul, ol ol, ul ol, ol ul');
        console.log(`✓ Nested lists: ${nestedLists.length > 0 ? 'YES ✓' : 'NO ✗'}`);

        console.log('\n=== Files saved ===');
        console.log('- response-screenshot.png');
        console.log('- response-html.txt');
        console.log('- chat-state-2.png');
      } else {
        console.log('ERROR: Could not find response element');
        const allContent = await page.content();
        if (allContent.includes('quadratic')) {
          console.log('But found "quadratic" in page content!');
          fs.writeFileSync('full-page.html', allContent);
        }
      }
    } else {
      console.log('ERROR: Message input not found');
    }

  } catch (error) {
    console.error('\nError:', error.message);
    try {
      await page.screenshot({ path: 'error-final.png', fullPage: true });
    } catch (e) {}
  } finally {
    await browser.close();
  }
})();
