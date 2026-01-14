const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('=== FINAL STYLING VERIFICATION ===\n');

    console.log('1. Navigate to chat...');
    await page.goto('http://localhost:3001/chat');
    await page.waitForTimeout(2000);

    console.log('2. Check if login needed...');
    if (page.url().includes('login')) {
      console.log('   - Logging in...');
      await page.fill('input[id="username"]', 'admin');
      await page.fill('input[id="password"]', 'password123');
      await page.click('button:has-text("Sign in")');
      await page.waitForURL('**/chat');
      await page.waitForTimeout(2000);
    }

    console.log('3. Find and click on a conversation with content...');
    // Look for conversations in sidebar
    const sidebarText = await page.content();

    // Let's look for one that has our test content
    const conversationSelectors = [
      'text=Table with 3 Rows',
      'text=Show the quadratic',
      'text=Styling Test'
    ];

    let foundConv = false;
    for (const selector of conversationSelectors) {
      const elem = await page.locator(selector).first();
      if (await elem.isVisible().catch(() => false)) {
        console.log(`   ✓ Found conversation: "${selector}"`);
        await elem.click();
        await page.waitForTimeout(3000);
        foundConv = true;
        break;
      }
    }

    if (!foundConv) {
      console.log('   - Looking for any conversation...');
      const convLinks = await page.locator('[class*="sidebar"] button, [class*="sidebar"] a, [class*="conversation"]').all();
      console.log(`   - Found ${convLinks.length} conversation items`);

      // Try clicking the second one (first is usually empty)
      if (convLinks.length > 1) {
        const secondConv = convLinks[1];
        const text = await secondConv.textContent();
        console.log(`   ✓ Clicking: ${text.substring(0, 40)}`);
        await secondConv.click();
        await page.waitForTimeout(3000);
        foundConv = true;
      }
    }

    console.log('\n4. Screenshot current state...');
    await page.screenshot({ path: 'conv-view.png', fullPage: true });

    console.log('5. Look for message content...');
    const articles = await page.$$('[role="article"]');
    console.log(`   Found ${articles.length} message articles`);

    if (articles.length > 0) {
      console.log('\n6. ANALYZING RESPONSE:\n');

      // Get the last/latest message which should be from assistant
      const lastMsg = articles[articles.length - 1];
      const html = await lastMsg.innerHTML();
      fs.writeFileSync('analysis-response.html', html);

      // TABLE
      const table = await lastMsg.$('table');
      if (table) {
        const rows = await lastMsg.$$('tbody tr');
        const headers = await lastMsg.$$('thead tr');
        console.log('TABLE:');
        console.log(`  ✓ Rendered as HTML <table>`);
        console.log(`  ✓ Headers: ${headers.length}, Rows: ${rows.length}`);
        console.log(`  STATUS: PASS ✓\n`);
      } else {
        console.log('TABLE:');
        console.log(`  ✗ Not rendered as HTML table`);
        console.log(`  STATUS: FAIL ✗\n`);
      }

      // CODE BLOCK
      const code = await lastMsg.$('pre code');
      if (code) {
        const codeClass = await code.getAttribute('class');
        const spans = await lastMsg.$$('pre code span');
        console.log('CODE BLOCK:');
        console.log(`  ✓ Rendered as <pre><code>`);
        if (codeClass) console.log(`  ✓ Class: ${codeClass}`);
        console.log(`  ✓ Syntax highlighting spans: ${spans.length}`);
        console.log(`  STATUS: PASS ✓\n`);
      } else {
        console.log('CODE BLOCK:');
        console.log(`  ✗ Not rendered as <pre><code>`);
        console.log(`  STATUS: FAIL ✗\n`);
      }

      // MATH
      const katexDisplay = await lastMsg.$('.katex-display');
      const katexInline = await lastMsg.$('.katex');
      if (katexDisplay || katexInline) {
        console.log('MATH FORMULA:');
        if (katexDisplay) console.log(`  ✓ KaTeX display mode`);
        if (katexInline) console.log(`  ✓ KaTeX inline mode`);
        console.log(`  STATUS: PASS ✓\n`);
      } else {
        console.log('MATH FORMULA:');
        console.log(`  ✗ Not rendered with KaTeX`);
        console.log(`  STATUS: FAIL ✗\n`);
      }

      // BLOCKQUOTE
      const blockquote = await lastMsg.$('blockquote');
      if (blockquote) {
        const style = await blockquote.evaluate((el) => {
          const s = window.getComputedStyle(el);
          return s.borderLeft;
        });
        console.log('BLOCKQUOTE:');
        console.log(`  ✓ Rendered as <blockquote>`);
        console.log(`  ✓ Border: ${style}`);
        console.log(`  STATUS: PASS ✓\n`);
      } else {
        console.log('BLOCKQUOTE:');
        console.log(`  ✗ Not rendered as <blockquote>`);
        console.log(`  STATUS: FAIL ✗\n`);
      }

      // LISTS
      const uls = await lastMsg.$$('ul');
      const ols = await lastMsg.$$('ol');
      if (uls.length > 0 || ols.length > 0) {
        const nestedLists = await lastMsg.$$('ul ul, ol ol, ul ol, ol ul');
        console.log('LISTS:');
        console.log(`  ✓ Unordered lists: ${uls.length}`);
        console.log(`  ✓ Ordered lists: ${ols.length}`);
        if (nestedLists.length > 0) {
          console.log(`  ✓ Nested lists: ${nestedLists.length}`);
        }
        console.log(`  STATUS: PASS ✓\n`);
      } else {
        console.log('LISTS:');
        console.log(`  ✗ No lists found`);
        console.log(`  STATUS: FAIL ✗\n`);
      }

      console.log('=== SUMMARY ===\n');
      const passing = [table, code, (katexDisplay || katexInline), blockquote, (uls.length > 0 || ols.length > 0)].filter(x => x).length;
      console.log(`Elements styling correctly: ${passing}/5`);

      if (passing === 5) {
        console.log('\n✅ ALL STYLING TESTS PASSED!');
      } else if (passing >= 3) {
        console.log('\n⚠️  PARTIAL - Some styling issues');
      } else {
        console.log('\n❌ MAJOR ISSUES');
      }

      console.log('\nFiles saved:');
      console.log('  - conv-view.png (screenshot)');
      console.log('  - analysis-response.html (HTML)');

    } else {
      console.log('   ✗ No messages found in conversation');
      console.log('\n   This might mean:');
      console.log('   - Conversation is still loading');
      console.log('   - No response has been generated yet');
      console.log('   - Need to send a message manually');
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
