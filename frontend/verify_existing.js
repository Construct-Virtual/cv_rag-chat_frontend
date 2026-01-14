const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('=== LLM OUTPUT STYLING VERIFICATION ===\n');
    console.log('Checking existing conversation with test content...\n');

    console.log('1. Login...');
    await page.goto('http://localhost:3001/login');
    await page.fill('input[id="username"]', 'admin');
    await page.fill('input[id="password"]', 'password123');
    await page.click('button:has-text("Sign in")');
    await page.waitForURL('**/chat');
    await page.waitForTimeout(3000);

    console.log('2. Click on conversation with "Table with 3 Rows"...');
    // Look for the conversation that mentions our test
    const conversationItems = await page.$$('[class*="conversation"], a[href*="conversation"]');
    console.log(`   Found ${conversationItems.length} conversation items`);

    // Click the first conversation in the sidebar (which seems to be our test)
    const sidebarLinks = await page.$$('div[class*="sidebar"] a, div[class*="conversation"]');
    for (let i = 0; i < sidebarLinks.length; i++) {
      const text = await sidebarLinks[i].textContent();
      console.log(`   Item ${i}: ${text.substring(0, 50)}`);
      if (text.includes('Table') || text.includes('Show the quadratic')) {
        console.log(`   → Clicking: ${text.substring(0, 50)}`);
        await sidebarLinks[i].click();
        break;
      }
    }

    await page.waitForTimeout(3000);
    console.log('3. Taking screenshot...');
    await page.screenshot({ path: 'response.png', fullPage: true });

    console.log('4. Analyzing response...');

    // Get article (assistant message)
    const articles = await page.$$('[role="article"]');
    console.log(`   Found ${articles.length} articles`);

    if (articles.length > 0) {
      const lastArticle = articles[articles.length - 1];
      const html = await lastArticle.innerHTML();
      fs.writeFileSync('response.html', html);

      console.log('\n=== VERIFICATION RESULTS ===\n');

      // 1. TABLE
      const table = await lastArticle.$('table');
      console.log('TABLE:');
      if (table) {
        const rows = await lastArticle.$$('tbody tr');
        console.log(`  ✓ Rendered as <table> (${rows.length} rows)`);
        console.log(`  STATUS: PASS ✓`);
      } else {
        console.log(`  ✗ NOT rendered as HTML table`);
        console.log(`  STATUS: FAIL ✗`);
      }

      console.log();

      // 2. CODE BLOCK
      const code = await lastArticle.$('pre code');
      console.log('CODE BLOCK:');
      if (code) {
        const codeClass = await code.getAttribute('class');
        const spans = await lastArticle.$$('pre code span');
        console.log(`  ✓ Rendered as <pre><code>`);
        console.log(`  ✓ Class: ${codeClass}`);
        console.log(`  ✓ Syntax spans: ${spans.length}`);
        console.log(`  STATUS: PASS ✓`);
      } else {
        console.log(`  ✗ NOT rendered as <pre><code>`);
        console.log(`  STATUS: FAIL ✗`);
      }

      console.log();

      // 3. MATH
      const katex = await lastArticle.$('.katex');
      console.log('MATH FORMULA:');
      if (katex) {
        const mathDisplay = await lastArticle.$('.katex-display');
        console.log(`  ✓ Rendered with KaTeX`);
        if (mathDisplay) console.log(`  ✓ Display mode`);
        console.log(`  STATUS: PASS ✓`);
      } else {
        console.log(`  ✗ NOT rendered (may be raw LaTeX)`);
        console.log(`  STATUS: FAIL ✗`);
      }

      console.log();

      // 4. BLOCKQUOTE
      const blockquote = await lastArticle.$('blockquote');
      console.log('BLOCKQUOTE:');
      if (blockquote) {
        const style = await blockquote.evaluate((el) => window.getComputedStyle(el).borderLeft);
        console.log(`  ✓ Rendered as <blockquote>`);
        console.log(`  ✓ Border: ${style}`);
        console.log(`  STATUS: PASS ✓`);
      } else {
        console.log(`  ✗ NOT rendered as <blockquote>`);
        console.log(`  STATUS: FAIL ✗`);
      }

      console.log();

      // 5. LISTS
      const uls = await lastArticle.$$('ul');
      const ols = await lastArticle.$$('ol');
      console.log('LISTS:');
      if (uls.length > 0 || ols.length > 0) {
        console.log(`  ✓ Found ${uls.length} UL + ${ols.length} OL`);
        const nested = await lastArticle.$$('ul ul, ol ol, ul ol, ol ul');
        if (nested.length > 0) {
          console.log(`  ✓ Nested lists: YES (${nested.length})`);
        }
        console.log(`  STATUS: PASS ✓`);
      } else {
        console.log(`  ✗ NO lists found`);
        console.log(`  STATUS: FAIL ✗`);
      }

      console.log('\n=== SUMMARY ===');
      console.log('\nFiles saved:');
      console.log('  response.png - screenshot');
      console.log('  response.html - HTML');
    }

  } catch (error) {
    console.error('Error:', error.message);
    try {
      await page.screenshot({ path: 'error.png', fullPage: true });
    } catch (e) {}
  } finally {
    await browser.close();
  }
})();
