import { test, expect } from '@playwright/test';

test('Verify LLM output styling', async ({ page }) => {
  // Navigate to login page
  await page.goto('http://localhost:3001/login');

  // Wait for page to load
  await page.waitForLoadState('networkidle');

  // Login with credentials
  await page.fill('input[type="text"]', 'admin');
  await page.fill('input[type="password"]', 'password123');
  await page.click('button:has-text("Sign in")');

  // Wait for redirect to chat page
  await page.waitForURL('**/chat', { timeout: 10000 });
  await page.waitForLoadState('networkidle');

  // Send the test message
  const testMessage = 'Show me a table with 3 rows, a code block in Python, the quadratic formula as math, a blockquote, and a nested list';
  await page.fill('input[placeholder="Type your message..."]', testMessage);
  await page.click('button:has-text("Send")');

  // Wait for response to appear
  await page.waitForSelector('[data-testid="assistant-message"]', { timeout: 30000 });

  // Take screenshot
  await page.screenshot({ path: 'response-screenshot.png', fullPage: true });

  // Get the response text to verify different elements
  const responseContent = await page.locator('[data-testid="assistant-message"]').first();

  console.log('=== STYLING VERIFICATION RESULTS ===\n');

  // Check for table
  const table = responseContent.locator('table');
  const tableCount = await table.count();
  console.log(`Table element found: ${tableCount > 0 ? 'YES' : 'NO'}`);
  if (tableCount > 0) {
    const rows = await table.locator('tbody tr').count();
    console.log(`  - Table rows: ${rows}`);
  }

  // Check for code block
  const codeBlock = responseContent.locator('pre code');
  const codeCount = await codeBlock.count();
  console.log(`Code block found: ${codeCount > 0 ? 'YES' : 'NO'}`);
  if (codeCount > 0) {
    const codeClass = await codeBlock.first().getAttribute('class');
    console.log(`  - Has syntax highlighting class: ${codeClass?.includes('language-') ? 'YES' : 'NO'}`);
  }

  // Check for math formula
  const mathElements = responseContent.locator('script[type="math/tex"]');
  const mathCount = await mathElements.count();
  console.log(`Math formula elements found: ${mathCount > 0 ? 'YES' : 'NO'}`);

  // Check for blockquote
  const blockquote = responseContent.locator('blockquote');
  const blockquoteCount = await blockquote.count();
  console.log(`Blockquote found: ${blockquoteCount > 0 ? 'YES' : 'NO'}`);
  if (blockquoteCount > 0) {
    const borderStyle = await blockquote.first().evaluate((el) => {
      return window.getComputedStyle(el).borderLeft;
    });
    console.log(`  - Has border styling: ${borderStyle ? 'YES' : 'NO'}`);
  }

  // Check for nested lists
  const lists = responseContent.locator('ul, ol');
  const listCount = await lists.count();
  console.log(`Lists found: ${listCount}`);

  // Check nested list structure
  const nestedLists = responseContent.locator('ul ul, ul ol, ol ul, ol ol');
  const nestedCount = await nestedLists.count();
  console.log(`Nested lists found: ${nestedCount > 0 ? 'YES' : 'NO'}`);

  console.log('\n=== END VERIFICATION ===');
});
