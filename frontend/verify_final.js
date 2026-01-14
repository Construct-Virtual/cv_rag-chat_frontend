const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('=== LLM OUTPUT STYLING VERIFICATION TEST ===\n');

    console.log('1. Login...');
    await page.goto('http://localhost:3001/login');
    await page.fill('input[id="username"]', 'admin');
    await page.fill('input[id="password"]', 'password123');
    await page.click('button:has-text("Sign in")');
    await page.waitForURL('**/chat');

    console.log('2. Create new conversation...');
    await page.click('button:has-text("+ New Chat")');
    await page.waitForTimeout(2000);

    console.log('3. Send test message...');
    const testMessage = 'Show me a table with 3 rows, a code block in Python, the quadratic formula as math, a blockquote, and a nested list';
    const messageInput = await page.$('input[placeholder*="message"]');
    await messageInput.fill(testMessage);
    await messageInput.press('Enter');

    console.log('4. Wait for response (60 seconds timeout)...');
    let responseFound = false;
    for (let i = 0; i < 120; i++) {
      const content = await page.content();
      if (
        content.includes('<table') ||
        content.includes('quadratic') ||
        content.includes('```') ||
        content.includes('<blockquote')
      ) {
        console.log('   Response detected!');
        responseFound = true;
        break;
      }
      await page.waitForTimeout(500);
    }

    if (!responseFound) {
      console.log('   WARNING: Response not fully detected, but continuing...');
    }

    console.log('5. Screenshot...');
    await page.screenshot({ path: 'test-response.png', fullPage: true });

    console.log('6. Analyze response styling...');

    // Get the last article (should be assistant message)
    const articles = await page.$$('[role="article"]');
    if (articles.length === 0) {
      console.log('   ERROR: No articles found');
      return;
    }

    const response = articles[articles.length - 1];
    const html = await response.innerHTML();
    fs.writeFileSync('test-response-html.txt', html);

    console.log('\n=== VERIFICATION RESULTS ===\n');

    // 1. TABLE
    const table = await response.$('table');
    if (table) {
      const rows = await response.$$('tbody tr');
      const headerRows = await response.$$('thead tr');
      console.log('TABLE:');
      console.log(`  ✓ Rendered as <table> element`);
      console.log(`  ✓ Header rows: ${headerRows.length}`);
      console.log(`  ✓ Body rows: ${rows.length}`);
      console.log(`  STATUS: PASS`);
    } else {
      const tableText = html.includes('|') && html.includes('---') ? '(found pipe characters, not rendered)' : '';
      console.log('TABLE:');
      console.log(`  ✗ Not rendered as HTML table ${tableText}`);
      console.log(`  STATUS: FAIL`);
    }

    console.log();

    // 2. CODE BLOCK
    const codeBlock = await response.$('pre code');
    if (codeBlock) {
      const codeClass = await codeBlock.getAttribute('class');
      const hasLanguage = codeClass?.includes('language-') || codeClass?.includes('hljs');
      const spans = await response.$$('pre code span');
      console.log('CODE BLOCK:');
      console.log(`  ✓ Rendered as <pre><code> element`);
      if (hasLanguage) {
        console.log(`  ✓ Language class detected: ${codeClass}`);
      }
      console.log(`  ✓ Syntax highlighting spans: ${spans.length}`);
      console.log(`  STATUS: ${hasLanguage ? 'PASS' : 'PARTIAL'}`);
    } else {
      console.log('CODE BLOCK:');
      console.log(`  ✗ Not rendered as <pre><code>`);
      console.log(`  STATUS: FAIL`);
    }

    console.log();

    // 3. MATH FORMULA
    const katexDisplay = await response.$('.katex-display');
    const katexInline = await response.$('.katex');
    const mathSpan = await response.$('span[class*="math"]');
    const mathScript = await response.$('script[type*="math"]');

    if (katexDisplay || katexInline || mathSpan || mathScript) {
      console.log('MATH FORMULA:');
      if (katexDisplay) console.log(`  ✓ KaTeX display rendering`);
      if (katexInline) console.log(`  ✓ KaTeX inline rendering`);
      if (mathSpan) console.log(`  ✓ Math span element`);
      console.log(`  STATUS: PASS`);
    } else {
      console.log('MATH FORMULA:');
      console.log(`  ✗ No math rendering detected (may show raw LaTeX)`);
      console.log(`  STATUS: FAIL`);
    }

    console.log();

    // 4. BLOCKQUOTE
    const blockquote = await response.$('blockquote');
    if (blockquote) {
      const style = await blockquote.evaluate((el) => {
        const s = window.getComputedStyle(el);
        return {
          borderLeft: s.borderLeft,
          borderLeftColor: s.borderLeftColor,
          borderLeftWidth: s.borderLeftWidth
        };
      });
      console.log('BLOCKQUOTE:');
      console.log(`  ✓ Rendered as <blockquote> element`);
      console.log(`  ✓ Border styling: ${style.borderLeft}`);
      console.log(`  STATUS: PASS`);
    } else {
      console.log('BLOCKQUOTE:');
      console.log(`  ✗ Not rendered as <blockquote> element`);
      console.log(`  STATUS: FAIL`);
    }

    console.log();

    // 5. LISTS
    const uls = await response.$$('ul');
    const ols = await response.$$('ol');
    const totalLists = uls.length + ols.length;

    if (totalLists > 0) {
      const nestedLists = await response.$$('ul ul, ul ol, ol ul, ol ol');
      console.log('LISTS:');
      console.log(`  ✓ Found ${totalLists} lists (UL: ${uls.length}, OL: ${ols.length})`);

      // Show structure
      for (let i = 0; i < Math.min(2, uls.length + ols.length); i++) {
        const list = uls[i] || ols[i];
        const items = await list.$$(':scope > li');
        console.log(`  ✓ List ${i + 1}: ${items.length} items`);
      }

      if (nestedLists.length > 0) {
        console.log(`  ✓ Nested lists: ${nestedLists.length}`);
      }
      console.log(`  STATUS: PASS`);
    } else {
      console.log('LISTS:');
      console.log(`  ✗ No list elements found`);
      console.log(`  STATUS: FAIL`);
    }

    console.log('\n=== SUMMARY ===');
    console.log('\nFiles saved:');
    console.log('  - test-response.png (full page screenshot)');
    console.log('  - test-response-html.txt (raw HTML)');

  } catch (error) {
    console.error('\nError:', error.message);
    try {
      await page.screenshot({ path: 'test-error.png', fullPage: true });
      console.log('Error screenshot: test-error.png');
    } catch (e) {}
  } finally {
    await browser.close();
  }
})();
