const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('=== CHECKING EXISTING CONVERSATION ===\n');

    console.log('1. Navigate to chat...');
    await page.goto('http://localhost:3001/chat');

    console.log('2. Check login...');
    const loginPageShown = page.url().includes('login');
    if (loginPageShown) {
      console.log('   Need to login...');
      await page.fill('input[id="username"]', 'admin');
      await page.fill('input[id="password"]', 'password123');
      await page.click('button:has-text("Sign in")');
      await page.waitForURL('**/chat');
    }

    await page.waitForTimeout(2000);

    console.log('3. Find conversations in sidebar...');
    // Get all links/clickable items in sidebar that look like conversations
    const allText = await page.content();

    // Find all elements that might be conversations
    const sidebarItems = await page.$$('[class*="sidebar"] button, [class*="sidebar"] a, [class*="sidebar"] div[role="button"]');
    console.log(`   Found ${sidebarItems.length} sidebar items`);

    // Look for "Table with 3 Rows" conversation
    let foundConv = false;
    for (let i = 0; i < sidebarItems.length; i++) {
      const text = await sidebarItems[i].textContent();
      if (text && text.includes('Table')) {
        console.log(`   → Found conversation: "${text.substring(0, 60)}"`);
        console.log(`   → Clicking...`);
        await sidebarItems[i].click();
        await page.waitForTimeout(2000);
        foundConv = true;
        break;
      }
    }

    if (!foundConv) {
      console.log('   Conversation not found, listing all sidebar text:');
      for (let i = 0; i < Math.min(5, sidebarItems.length); i++) {
        const text = await sidebarItems[i].textContent();
        console.log(`     ${i}: "${text.substring(0, 40)}"`);
      }
    }

    console.log('\n4. Screenshot...');
    await page.screenshot({ path: 'conversation.png', fullPage: true });

    console.log('5. Check for messages...');
    const articles = await page.$$('[role="article"]');
    console.log(`   Found ${articles.length} messages`);

    if (articles.length > 0) {
      console.log('\n6. Analyzing last message (assistant response)...');
      const lastMsg = articles[articles.length - 1];
      const html = await lastMsg.innerHTML();
      fs.writeFileSync('conv-response.html', html);

      console.log('\n=== CONTENT ANALYSIS ===\n');

      // TABLE
      const table = await lastMsg.$('table');
      console.log(`TABLE: ${table ? '✓ YES' : '✗ NO'}`);

      // CODE
      const code = await lastMsg.$('pre code');
      console.log(`CODE BLOCK: ${code ? '✓ YES' : '✗ NO'}`);

      // MATH
      const math = await lastMsg.$('.katex');
      console.log(`MATH: ${math ? '✓ YES' : '✗ NO'}`);

      // BLOCKQUOTE
      const bq = await lastMsg.$('blockquote');
      console.log(`BLOCKQUOTE: ${bq ? '✓ YES' : '✗ NO'}`);

      // LISTS
      const lists = await lastMsg.$$('ul, ol');
      console.log(`LISTS: ${lists.length > 0 ? `✓ YES (${lists.length})` : '✗ NO'}`);

      // Get text preview
      const text = await lastMsg.textContent();
      console.log(`\nMessage preview: ${text.substring(0, 200)}`);
    }

  } catch (error) {
    console.error('Error:', error.message);
    try {
      await page.screenshot({ path: 'error2.png', fullPage: true });
    } catch (e) {}
  } finally {
    await browser.close();
  }
})();
