/**
 * Markdown Post-Processor
 *
 * Normalizes LLM-generated markdown to ensure proper formatting.
 * Handles cases where the LLM doesn't include proper newlines between elements.
 * IMPORTANT: Protects code blocks from being processed.
 */

/**
 * Math content indicators - patterns that suggest mathematical content
 * Used to distinguish math expressions from regular parenthetical text
 */
const MATH_INDICATORS = [
  /\\[a-zA-Z]+/,           // LaTeX commands like \frac, \sqrt, \pm, \times, etc.
  /\^/,                     // Superscript
  /_\{/,                    // Subscript with braces
  /_[a-zA-Z0-9]/,          // Subscript
  /[a-zA-Z]\s*=\s*[a-zA-Z0-9]/,  // Variable assignment like x = 2
  /[+\-*/]\s*[a-zA-Z]/,    // Operators with variables
  /[a-zA-Z]\s*[+\-*/]\s*[a-zA-Z0-9]/, // Variable expressions
  /\d+\s*[a-zA-Z]\s*[+\-*/=]/, // Expressions like 2x + 3
  /[a-zA-Z]\s*\^\s*\d/,    // Powers like x^2
  /\\?sqrt/,               // Square root
  /\\?frac/,               // Fractions
  /\\?sum/,                // Summation
  /\\?int/,                // Integral
  /\\?lim/,                // Limit
  /\\?infty/,              // Infinity
  /\\?alpha|\\?beta|\\?gamma|\\?delta|\\?theta|\\?pi|\\?sigma|\\?omega/i, // Greek letters
  /\{[^}]*\}/,             // Braced expressions (common in LaTeX)
];

/**
 * Check if content appears to be mathematical
 * @param content - The content inside parentheses/brackets
 * @returns true if the content looks like math
 */
function isMathContent(content: string): boolean {
  // Empty or very short content is unlikely to be math we want to render
  if (!content || content.trim().length < 2) {
    return false;
  }

  const trimmed = content.trim();

  // If it starts with a backslash, it's almost certainly LaTeX
  if (trimmed.startsWith('\\')) {
    return true;
  }

  // Check against our math indicators
  for (const indicator of MATH_INDICATORS) {
    if (indicator.test(trimmed)) {
      return true;
    }
  }

  // Check for simple variable expressions: single letters that could be variables
  // But be careful not to match prose like "(a)", "(e.g.)", "(i.e.)", "(etc)"
  const simpleVarPattern = /^[a-zA-Z]$/;
  if (simpleVarPattern.test(trimmed)) {
    // Single letters could be variables in math context, but we need more evidence
    // Don't convert these as they're often prose
    return false;
  }

  // Check for expressions that look like equations
  // e.g., "x^2 + y^2 = z^2" or "a + b"
  const equationPattern = /^[a-zA-Z0-9\s+\-*/^=(){}[\]\\.,]+$/;
  const hasOperatorOrPower = /[\^=]|[+\-*/]\s*[a-zA-Z]|[a-zA-Z]\s*[+\-*/]/.test(trimmed);

  if (equationPattern.test(trimmed) && hasOperatorOrPower) {
    return true;
  }

  return false;
}

/**
 * Convert LaTeX-style math delimiters to standard markdown math delimiters.
 * - \( ... \) -> $...$  (inline math)
 * - \[ ... \] -> $$...$$ (display math)
 * - Also handles non-backslash versions when content is clearly mathematical
 *
 * @param content - Markdown content (with code blocks already extracted)
 * @returns Content with converted math delimiters
 */
function convertMathDelimiters(content: string): string {
  let processed = content;

  // First, handle explicit LaTeX delimiters with backslashes
  // These are unambiguous and should always be converted

  // Convert \[ ... \] to $$...$$ (display math)
  // Use a proper regex that matches \[ followed by any content until \]
  // The content can span multiple lines
  processed = processed.replace(/\\\[([\s\S]*?)\\\]/g, (match, mathContent) => {
    return `$$${mathContent.trim()}$$`;
  });

  // Convert \( ... \) to $...$ (inline math)
  // Use a proper regex that matches \( followed by any content until \)
  processed = processed.replace(/\\\(([\s\S]*?)\\\)/g, (match, mathContent) => {
    return `$${mathContent.trim()}$`;
  });

  // Now handle non-backslash versions, but only when content is clearly mathematical
  // This is trickier because we need to distinguish math from prose

  // Handle display math: [ ... ] at the start of a line or after whitespace
  // Only convert if content looks like math
  processed = processed.replace(/(?:^|\s)\[\s*([^\]]+?)\s*\](?=\s|$|[.,;:!?])/gm, (match, mathContent, offset) => {
    // Check if this looks like a markdown link [text](url) - don't convert those
    const afterMatch = content.slice(offset + match.length);
    if (afterMatch.startsWith('(')) {
      return match; // This is a markdown link, don't convert
    }

    if (isMathContent(mathContent)) {
      // Preserve leading whitespace
      const leadingSpace = match.match(/^(\s*)/)?.[1] || '';
      const trailingChar = match.match(/([.,;:!?])$/)?.[1] || '';
      return `${leadingSpace}$$${mathContent.trim()}$$${trailingChar}`;
    }
    return match;
  });

  // Handle inline math: ( ... ) when content is clearly mathematical
  // Be more conservative here to avoid false positives
  processed = processed.replace(/\(\s*([^()]+?)\s*\)/g, (match, mathContent) => {
    // Skip if this looks like a function call or regular parenthetical
    // Common non-math patterns to skip:
    const skipPatterns = [
      /^see\s/i,           // (see above)
      /^e\.?g\.?\s*,?/i,   // (e.g., example)
      /^i\.?e\.?\s*,?/i,   // (i.e., that is)
      /^etc\.?\s*$/i,      // (etc)
      /^note:?\s/i,        // (note: ...)
      /^or\s/i,            // (or something)
      /^and\s/i,           // (and something)
      /^optional\s*$/i,    // (optional)
      /^required\s*$/i,    // (required)
      /^s\)$/,             // Plural marker like "file(s)"
      /^\d+$/,             // Just numbers like (1), (2)
      /^[a-z]$/i,          // Single letters often used for lists (a), (b)
      /^\d+\s*(minutes?|hours?|days?|seconds?|ms|s|m|h|d)/i, // Time durations
      /^(yes|no|true|false|on|off)$/i, // Boolean-like values
      /^https?:/i,         // URLs
      /^[A-Z]{2,}$/,       // Acronyms like (USA), (API)
    ];

    const trimmed = mathContent.trim();
    for (const pattern of skipPatterns) {
      if (pattern.test(trimmed)) {
        return match;
      }
    }

    // Only convert if it clearly looks like math
    if (isMathContent(mathContent)) {
      return `$${mathContent.trim()}$`;
    }

    return match;
  });

  return processed;
}

/**
 * Common sentence-starting words that indicate prose content
 * (not heading continuation)
 */
const PROSE_STARTERS = [
  'The', 'This', 'These', 'That', 'Those',
  'A', 'An', 'And', 'But', 'Or', 'So', 'Yet',
  'Based', 'According', 'Here', 'There',
  'In', 'On', 'At', 'For', 'From', 'To', 'With', 'By',
  'It', 'Its', 'They', 'We', 'You', 'Our', 'Your',
  'When', 'Where', 'What', 'Why', 'How', 'Which', 'Who',
  'If', 'As', 'While', 'Although', 'However', 'Therefore',
  'Following', 'Below', 'Above', 'Please', 'Note',
  'First', 'Second', 'Third', 'Finally', 'Additionally',
  'Furthermore', 'Moreover', 'Thus', 'Hence',
  'Each', 'Every', 'All', 'Some', 'Many', 'Most', 'Several',
  'One', 'Two', 'Three', 'Four', 'Five',
];

/**
 * Patterns that indicate the start of content (not heading text)
 */
const CONTENT_START_PATTERNS = [
  /^(The|This|These|That|Those|A|An)\s+\w+/,  // Articles followed by words
  /^(Based|According)\s+(on|to)\s+/i,         // "Based on...", "According to..."
  /^(Here|There)\s+(is|are|was|were)\s+/i,    // "Here is...", "There are..."
  /^(In|On|At|For|From|To|With|By)\s+the\s+/i, // Preposition + "the"
  /^(It|They|We|You)\s+(is|are|was|were|will|can|should|must|may|might)\s+/i, // Pronoun + verb
  /^(Following|Below|Above)\s+(is|are|you|we|the)\s+/i, // Position words
  /^(Please|Note)\s+/i,                       // Instruction starters
  /^(If|When|While|Although|As)\s+\w+\s+/i,   // Conditional starters
  /^(Each|Every|All|Some|Many|Most|Several)\s+\w+/i, // Quantifiers
  /^(First|Second|Third|Finally|Additionally|Furthermore|Moreover)\s*,?\s+/i, // Sequence words
  /^-\s+/,                                    // List item
  /^\d+\.\s+/,                                // Numbered list
  /^\*\*[A-Z]/,                               // Bold text starting with capital
];

/**
 * Separate heading text from inline content that should be a paragraph.
 *
 * Detects cases like:
 * - "## Security Protocols Based on the information..." -> "## Security Protocols\n\nBased on..."
 * - "### Heading The content here..." -> "### Heading\n\nThe content here..."
 *
 * @param content - Markdown content (with code blocks already extracted)
 * @returns Content with properly separated headings
 */
function separateHeadingContent(content: string): string {
  const lines = content.split('\n');
  const result: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if this line is a heading
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (!headingMatch) {
      result.push(line);
      continue;
    }

    const hashes = headingMatch[1];
    const headingContent = headingMatch[2];

    // Try to find where heading ends and content begins
    const separatedContent = separateHeadingFromContent(headingContent);

    if (separatedContent) {
      result.push(`${hashes} ${separatedContent.heading}`);
      result.push('');
      result.push(separatedContent.content);
    } else {
      result.push(line);
    }
  }

  return result.join('\n');
}

/**
 * Attempt to separate a heading's text from inline content.
 * Returns null if no separation is needed.
 *
 * @param text - The text after the # markers
 * @returns Object with heading and content, or null
 */
function separateHeadingFromContent(text: string): { heading: string; content: string } | null {
  // If the text is short enough, it's probably just a heading
  if (text.length < 20) {
    return null;
  }

  // Strategy 1: Look for prose starter words
  // Find the first occurrence of a prose starter that makes sense as a break point
  for (const starter of PROSE_STARTERS) {
    // Look for the word preceded by a space (to avoid matching mid-word)
    const pattern = new RegExp(`\\s(${starter}\\s)`, 'g');
    let match;

    while ((match = pattern.exec(text)) !== null) {
      const breakIndex = match.index + 1; // Position of the starter word
      const headingPart = text.slice(0, breakIndex).trim();
      const contentPart = text.slice(breakIndex).trim();

      // Validate the split
      if (isValidHeadingSplit(headingPart, contentPart, starter)) {
        return { heading: headingPart, content: contentPart };
      }
    }
  }

  // Strategy 2: Look for content start patterns
  for (const pattern of CONTENT_START_PATTERNS) {
    // Find where this pattern might start
    const words = text.split(/\s+/);
    for (let wordIdx = 1; wordIdx < words.length; wordIdx++) {
      const potentialContent = words.slice(wordIdx).join(' ');
      if (pattern.test(potentialContent)) {
        const headingPart = words.slice(0, wordIdx).join(' ');

        // Only split if heading part is reasonable length (not too short, not too long)
        if (headingPart.length >= 3 && headingPart.length <= 60) {
          return { heading: headingPart, content: potentialContent };
        }
      }
    }
  }

  // Strategy 3: Handle very long "headings" (likely merged content)
  // If the heading is over 80 chars, look for a natural break
  if (text.length > 80) {
    // Look for sentence boundaries within the first 60 chars
    const earlyBreak = findNaturalBreak(text, 60);
    if (earlyBreak) {
      return earlyBreak;
    }
  }

  return null;
}

/**
 * Validate that a heading split makes sense.
 *
 * @param headingPart - The proposed heading text
 * @param contentPart - The proposed content text
 * @param starterWord - The word that triggered the split
 * @returns true if the split is valid
 */
function isValidHeadingSplit(headingPart: string, contentPart: string, starterWord: string): boolean {
  // Heading should be reasonably short (typical headings are under 60 chars)
  if (headingPart.length > 60) {
    return false;
  }

  // Heading should have at least one word
  if (headingPart.split(/\s+/).length < 1) {
    return false;
  }

  // Heading shouldn't be too short (likely just cut off mid-phrase)
  if (headingPart.length < 3) {
    return false;
  }

  // Content should be substantial (at least a few words)
  if (contentPart.split(/\s+/).length < 3) {
    return false;
  }

  // Check that the content part looks like prose starting
  // It should start with the starter word and continue with more text
  const startsCorrectly = contentPart.toLowerCase().startsWith(starterWord.toLowerCase());
  if (!startsCorrectly) {
    return false;
  }

  // Avoid splitting in the middle of common phrases
  // e.g., "The Company" should not split as "The" + "Company..."
  const headingLower = headingPart.toLowerCase();
  const invalidEndings = [
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'by', 'with', 'from', 'as', 'is', 'are', 'was', 'were',
  ];
  const lastWord = headingPart.split(/\s+/).pop()?.toLowerCase() || '';
  if (invalidEndings.includes(lastWord)) {
    return false;
  }

  return true;
}

/**
 * Find a natural break point in long text for heading separation.
 * Looks for sentence endings, colons, or other natural breaks.
 *
 * @param text - The heading text to analyze
 * @param maxHeadingLen - Maximum desired heading length
 * @returns Split result or null
 */
function findNaturalBreak(text: string, maxHeadingLen: number): { heading: string; content: string } | null {
  // Look for common break patterns within the max length
  const searchArea = text.slice(0, maxHeadingLen + 20); // Search a bit beyond

  // Pattern 1: Colon followed by space and capital letter (often "Title: Description...")
  // But NOT if the colon is part of a time like "10:30"
  const colonMatch = searchArea.match(/^([^:]+):\s+([A-Z])/);
  if (colonMatch && colonMatch[1].length <= maxHeadingLen && colonMatch[1].length >= 3) {
    // Check it's not a time
    if (!/\d:\d/.test(colonMatch[1])) {
      const heading = colonMatch[1].trim();
      const content = text.slice(colonMatch[1].length + 1).trim();
      if (content.length > 10) {
        return { heading, content };
      }
    }
  }

  // Pattern 2: Dash followed by space and capital (often "Title - Description...")
  const dashMatch = searchArea.match(/^([^-]+)\s+-\s+([A-Z])/);
  if (dashMatch && dashMatch[1].length <= maxHeadingLen && dashMatch[1].length >= 3) {
    const heading = dashMatch[1].trim();
    const content = text.slice(dashMatch[0].length - 1).trim();
    if (content.length > 10) {
      return { heading, content };
    }
  }

  return null;
}

/**
 * Detect if a line is part of a GFM table.
 * A table line either:
 * - Starts with | (standard table row)
 * - Contains | surrounded by non-whitespace (inline pipes in cells)
 * - Is a separator row like |---|---|
 */
function isTableLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;

  // Must contain at least one pipe character
  if (!trimmed.includes('|')) return false;

  // Table rows typically start with | or have | as cell separators
  // Separator rows: |---|---| or |:---:|:---:| etc.
  // Data rows: | cell | cell | or cell | cell | cell

  // Check for separator row pattern: contains |---| or |:---| or |---:| patterns
  if (/\|[\s]*:?-+:?[\s]*\|/.test(trimmed)) {
    return true;
  }

  // Check if line starts with | (standard table format)
  if (trimmed.startsWith('|')) {
    return true;
  }

  // Check for lines that have | as separator between content
  // This handles tables without leading |
  // e.g., "Header 1 | Header 2 | Header 3"
  const pipeCount = (trimmed.match(/\|/g) || []).length;
  if (pipeCount >= 1) {
    // Make sure it's not just a single | in prose
    // Tables typically have multiple cells or consistent structure
    const parts = trimmed.split('|').map(p => p.trim());
    // If we have multiple non-empty parts, likely a table
    const nonEmptyParts = parts.filter(p => p.length > 0);
    if (nonEmptyParts.length >= 2) {
      return true;
    }
  }

  return false;
}

/**
 * Ensure GFM tables have blank lines before and after them.
 * remark-gfm requires proper spacing to parse tables correctly.
 *
 * @param content - Markdown content (with code blocks already extracted)
 * @returns Content with properly fenced tables
 */
function ensureTableFencing(content: string): string {
  const lines = content.split('\n');
  const result: string[] = [];
  let inTable = false;
  let tableStartIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isTable = isTableLine(line);
    const prevLine = i > 0 ? lines[i - 1] : '';
    const prevIsEmpty = prevLine.trim() === '';

    if (isTable && !inTable) {
      // Starting a new table
      inTable = true;
      tableStartIndex = result.length;

      // Ensure blank line before table (if not at start and prev line isn't empty)
      if (result.length > 0 && !prevIsEmpty) {
        result.push('');
      }
      result.push(line);
    } else if (isTable && inTable) {
      // Continuing table
      result.push(line);
    } else if (!isTable && inTable) {
      // Ending table - ensure blank line after
      inTable = false;
      tableStartIndex = -1;

      // Add blank line after table if this line isn't already empty
      if (line.trim() !== '') {
        result.push('');
      }
      result.push(line);
    } else {
      // Not in table, not a table line
      result.push(line);
    }
  }

  // If we ended while still in a table, no action needed
  // (the table is at the end of content)

  return result.join('\n');
}

/**
 * Post-process markdown content to ensure proper formatting.
 * Idempotent - safe to run multiple times on the same content.
 *
 * @param content - Raw markdown content from LLM
 * @returns Properly formatted markdown with correct newlines
 */
export function processMarkdown(content: string): string {
  if (!content || typeof content !== 'string') {
    return content || '';
  }

  // Step 1: Normalize newlines
  let processed = content.replace(/\r\n/g, '\n');

  // Step 2: FIRST fix code block fences - ensure they're on their own lines
  // Pattern: text followed by ``` (code fence inline with text)
  processed = processed.replace(/([^\n`])(```)/g, '$1\n\n$2');

  // Pattern: ``` followed by text that's not a language specifier on same line
  // Match: ```python code here -> ```python\ncode here
  processed = processed.replace(/(```\w*)\s+([^`\n])/g, '$1\n$2');

  // Ensure closing ``` is on its own line
  processed = processed.replace(/([^\n`])(```\s*\n|```\s*$)/g, '$1\n$2');

  // Step 3: Extract and protect code blocks
  const codeBlocks: string[] = [];
  const CODE_PLACEHOLDER = '___CODE_BLOCK_PLACEHOLDER___';

  // Match complete code blocks (```...```)
  processed = processed.replace(/```[\s\S]*?```/g, (match) => {
    codeBlocks.push(match);
    return CODE_PLACEHOLDER + (codeBlocks.length - 1) + '___';
  });

  // Step 4: Now process the non-code content

  // Convert LaTeX-style math delimiters to standard markdown math delimiters
  // This must happen before other processing so remark-math can parse them
  processed = convertMathDelimiters(processed);

  // Handle GFM tables - ensure blank lines before and after table blocks
  // Tables require blank lines for remark-gfm to parse them correctly
  processed = ensureTableFencing(processed);

  // CRITICAL: Fix inline headings - headings MUST be on their own line
  // This is the primary fix for headings rendering inline after sentences

  // Pattern 1: Heading after punctuation (most common case)
  // e.g., "Some text here. ## Heading" -> "Some text here.\n\n## Heading"
  processed = processed.replace(
    /([.!?:;,])\s*(#{1,6})\s+/g,
    '$1\n\n$2 '
  );

  // Pattern 2: Heading after closing brackets, quotes, or parentheses
  // e.g., "text (note) ## Heading" -> "text (note)\n\n## Heading"
  processed = processed.replace(
    /([)\]"'>])\s*(#{1,6})\s+/g,
    '$1\n\n$2 '
  );

  // Pattern 3: Heading after any word character (catches remaining cases)
  // e.g., "text here ## Heading" -> "text here\n\n## Heading"
  // Only match when heading has proper format (# followed by space and capital letter or number)
  processed = processed.replace(
    /(\w)\s+(#{1,6})\s+([A-Z0-9])/g,
    '$1\n\n$2 $3'
  );

  // Pattern 4: Heading directly concatenated without space (edge case)
  // e.g., "text##Heading" -> "text\n\n## Heading"
  processed = processed.replace(
    /([^\s#\n])(#{1,6})([A-Z])/g,
    '$1\n\n$2 $3'
  );

  // Separate heading text from inline content that merged together
  // e.g., "## Security Protocols Based on the information..." -> proper heading + paragraph
  processed = separateHeadingContent(processed);

  // Handle inline bullet lists
  processed = processed.replace(
    /([.!?:;])\s+(-\s+\*\*)/g,
    '$1\n\n$2'
  );

  processed = processed.replace(
    /([.!?])\s+(-\s+[A-Z])/g,
    '$1\n\n$2'
  );

  // Handle numbered lists inline
  processed = processed.replace(
    /([.!?:;])\s+(\d+\.\s+[A-Z*])/g,
    '$1\n\n$2'
  );

  // Handle blockquotes inline
  processed = processed.replace(
    /([.!?])\s+(>\s+)/g,
    '$1\n\n$2'
  );

  // Ensure headings have blank line before (if not at start)
  processed = processed.replace(
    /([^\n])\n(#{1,6}\s)/g,
    '$1\n\n$2'
  );

  // Ensure headings have blank line after
  processed = processed.replace(
    /(#{1,6}\s+[^\n]+)\n(?!\n)/g,
    '$1\n\n'
  );

  // Step 5: Restore code blocks
  codeBlocks.forEach((block, index) => {
    processed = processed.replace(CODE_PLACEHOLDER + index + '___', block);
  });

  // Step 6: Final cleanup - normalize excessive newlines
  processed = processed.replace(/\n{3,}/g, '\n\n');
  processed = processed.replace(/[ \t]+$/gm, '');

  return processed.trim();
}

/**
 * Process markdown for streaming content.
 * More conservative to avoid breaking incomplete code blocks.
 *
 * @param content - Streaming markdown content (may be incomplete)
 * @returns Partially processed markdown
 */
export function processStreamingMarkdown(content: string): string {
  if (!content || typeof content !== 'string') {
    return content || '';
  }

  // Normalize newlines
  let processed = content.replace(/\r\n/g, '\n');

  // Check if we're inside an unclosed code block
  const codeBlockStarts = (processed.match(/```/g) || []).length;
  if (codeBlockStarts % 2 !== 0) {
    // We're inside a code block - don't process anything
    // Just fix the opening fence if needed
    processed = processed.replace(/([^\n`])(```\w*)\s+/g, '$1\n\n$2\n');
    return processed;
  }

  // Extract and protect complete code blocks
  const codeBlocks: string[] = [];
  const CODE_PLACEHOLDER = '___CODE_BLOCK___';

  processed = processed.replace(/```[\s\S]*?```/g, (match) => {
    codeBlocks.push(match);
    return CODE_PLACEHOLDER + (codeBlocks.length - 1) + '___';
  });

  // Convert LaTeX-style math delimiters to standard markdown math delimiters
  processed = convertMathDelimiters(processed);

  // Handle GFM tables - ensure blank lines before and after table blocks
  processed = ensureTableFencing(processed);

  // CRITICAL: Fix inline headings - headings MUST be on their own line
  // Same patterns as processMarkdown but applied during streaming

  // Pattern 1: Heading after punctuation
  processed = processed.replace(
    /([.!?:;,])\s*(#{1,6})\s+/g,
    '$1\n\n$2 '
  );

  // Pattern 2: Heading after closing brackets, quotes, or parentheses
  processed = processed.replace(
    /([)\]"'>])\s*(#{1,6})\s+/g,
    '$1\n\n$2 '
  );

  // Pattern 3: Heading after any word character
  processed = processed.replace(
    /(\w)\s+(#{1,6})\s+([A-Z0-9])/g,
    '$1\n\n$2 $3'
  );

  // Pattern 4: Heading directly concatenated without space
  processed = processed.replace(
    /([^\s#\n])(#{1,6})([A-Z])/g,
    '$1\n\n$2 $3'
  );

  // Separate heading text from inline content that merged together
  processed = separateHeadingContent(processed);

  // Fix inline bullet lists after sentences
  processed = processed.replace(
    /([.!?])\s+(-\s+\*\*)/g,
    '$1\n\n$2'
  );

  // Fix inline numbered lists
  processed = processed.replace(
    /([.!?:;])\s+(\d+\.\s+[A-Z*])/g,
    '$1\n\n$2'
  );

  // Restore code blocks
  codeBlocks.forEach((block, index) => {
    processed = processed.replace(CODE_PLACEHOLDER + index + '___', block);
  });

  // Collapse excessive newlines
  processed = processed.replace(/\n{4,}/g, '\n\n\n');

  return processed;
}

/**
 * Check if content appears to have markdown formatting issues
 */
export function hasMarkdownIssues(content: string): boolean {
  if (!content) return false;

  // Check for headings without preceding newlines (inline)
  // Pattern 1: After punctuation
  if (/[.!?:;,]\s*#{1,6}\s+/.test(content)) {
    return true;
  }

  // Pattern 2: After word characters (heading inline with text)
  if (/\w\s+#{1,6}\s+[A-Z0-9]/.test(content)) {
    return true;
  }

  // Pattern 3: Heading directly after text without space
  if (/[^\s#\n]#{1,6}[A-Z]/.test(content)) {
    return true;
  }

  // Check for bullet points inline
  if (/[.!?]\s+-\s+/.test(content)) {
    return true;
  }

  // Check for tables without proper blank lines
  // Pattern: non-empty line followed directly by table row
  if (/[^\n]\n\|[^|]+\|/.test(content)) {
    const lines = content.split('\n');
    for (let i = 1; i < lines.length; i++) {
      const prevLine = lines[i - 1].trim();
      const currLine = lines[i].trim();
      // If current line looks like a table and previous line is non-empty and not a table
      if (isTableLine(currLine) && prevLine && !isTableLine(prevLine)) {
        return true;
      }
    }
  }

  return false;
}
