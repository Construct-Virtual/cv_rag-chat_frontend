const { chromium } = require('playwright');
const https = require('https');
const http = require('http');
const fs = require('fs');

async function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 8001,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(responseData));
        } catch (e) {
          resolve(responseData);
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('=== LLM OUTPUT STYLING VERIFICATION ===\n');

    console.log('STEP 1: Create conversation and send message via API...');
    // Login
    const loginRes = await makeRequest('POST', '/api/auth/login', {
      username: 'admin',
      password: 'password123'
    });

    const token = loginRes.access_token;
    console.log('  ✓ Logged in');

    // Create conversation
    const convRes = await makeRequest('POST', '/api/chat/conversations', {
      title: 'Styling Verification'
    });

    const convId = convRes.id;
    console.log(`  ✓ Created conversation: ${convId}`);

    // Send message
    const queryRes = await makeRequest('POST', '/api/chat/query', {
      conversation_id: convId,
      message: 'Show me a table with 3 rows, a code block in Python, the quadratic formula as math, a blockquote, and a nested list'
    });

    console.log('  ✓ Sent message to API');

    // Wait for processing
    console.log('  ⏳ Waiting for response...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('\nSTEP 2: Fetch response from API...');
    // Get messages for this conversation
    const messagesRes = await makeRequest('GET', `/api/chat/conversations/${convId}/messages`);
    console.log(`  ✓ Retrieved messages`);

    if (!Array.isArray(messagesRes) || messagesRes.length < 2) {
      console.log('  ⚠️  Not enough messages yet, waiting more...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    console.log('\nSTEP 3: View response in browser and screenshot...');
    // Login in browser
    await page.goto('http://localhost:3001/login');
    await page.fill('input[id="username"]', 'admin');
    await page.fill('input[id="password"]', 'password123');
    await page.click('button:has-text("Sign in")');
    await page.waitForURL('**/chat');
    await page.waitForTimeout(2000);

    // Navigate directly to conversation
    await page.goto(`http://localhost:3001/chat?conv=${convId}`);
    await page.waitForTimeout(3000);

    console.log('  ✓ Navigated to conversation');
    await page.screenshot({ path: 'final-response.png', fullPage: true });
    console.log('  ✓ Screenshot taken');

    console.log('\nSTEP 4: Analyze response HTML...');

    // Get the last article (assistant message)
    const articles = await page.$$('[role="article"]');
    if (articles.length === 0) {
      console.log('  ✗ No message articles found');
      console.log('\nFalling back to API HTML analysis...');
    } else {
      const lastArticle = articles[articles.length - 1];
      const html = await lastArticle.innerHTML();
      fs.writeFileSync('response-content.html', html);

      console.log('\n=== VERIFICATION RESULTS ===\n');

      // TABLE
      const table = await lastArticle.$('table');
      const tableStatus = table ? 'PASS ✓' : 'FAIL ✗';
      console.log(`TABLE:                    ${tableStatus}`);
      if (table) {
        const rows = await lastArticle.$$('tbody tr');
        const headers = await lastArticle.$$('thead tr');
        console.log(`  - Headers: ${headers.length}, Body rows: ${rows.length}`);
      }

      // CODE BLOCK
      const code = await lastArticle.$('pre code');
      const codeStatus = code ? 'PASS ✓' : 'FAIL ✗';
      console.log(`CODE BLOCK:               ${codeStatus}`);
      if (code) {
        const codeClass = await code.getAttribute('class');
        const hasHighlight = codeClass?.includes('language-') || codeClass?.includes('hljs');
        console.log(`  - Syntax highlighting: ${hasHighlight ? 'YES' : 'NO'}`);
      }

      // MATH FORMULA
      const katex = await lastArticle.$('.katex-display, .katex');
      const mathStatus = katex ? 'PASS ✓' : 'FAIL ✗';
      console.log(`MATH FORMULA:             ${mathStatus}`);
      if (katex) {
        const isDisplay = await lastArticle.$('.katex-display') !== null;
        console.log(`  - Mode: ${isDisplay ? 'display' : 'inline'}`);
      }

      // BLOCKQUOTE
      const blockquote = await lastArticle.$('blockquote');
      const blockquoteStatus = blockquote ? 'PASS ✓' : 'FAIL ✗';
      console.log(`BLOCKQUOTE:               ${blockquoteStatus}`);
      if (blockquote) {
        const border = await blockquote.evaluate((el) => window.getComputedStyle(el).borderLeft);
        console.log(`  - Border: ${border}`);
      }

      // LISTS
      const uls = await lastArticle.$$('ul');
      const ols = await lastArticle.$$('ol');
      const totalLists = uls.length + ols.length;
      const listsStatus = totalLists > 0 ? 'PASS ✓' : 'FAIL ✗';
      console.log(`LISTS:                    ${listsStatus}`);
      if (totalLists > 0) {
        const nested = await lastArticle.$$('ul ul, ol ol, ul ol, ol ul');
        console.log(`  - Total: ${totalLists}, Nested: ${nested.length}`);
      }

      console.log('\n=== SUMMARY ===');
      const allPass = [table, code, katex, blockquote, totalLists > 0].filter(x => x).length;
      console.log(`\nPassing: ${allPass}/5 elements`);

      if (allPass === 5) {
        console.log('\n✓ ALL STYLING CHECKS PASSED!');
      } else if (allPass >= 3) {
        console.log('\n⚠️  PARTIAL PASS - Some elements missing styling');
      } else {
        console.log('\n✗ MAJOR ISSUES - Most elements not styled');
      }

      console.log('\nFiles saved:');
      console.log('  - final-response.png');
      console.log('  - response-content.html');
    }

  } catch (error) {
    console.error('Error:', error.message);
    console.error(error);
  } finally {
    await browser.close();
  }
})();
