/**
 * Markdown rendering with safety.
 * Uses markdown-it to parse markdown, then sanitizes with DOMPurify
 * to prevent XSS attacks from untrusted content.
 *
 * This ensures:
 * 1. Markdown syntax is correctly parsed
 * 2. Raw HTML/scripts in the markdown cannot execute
 * 3. Safe markdown elements (code, links, lists, etc.) are preserved
 *
 * Security note on <img>:
 * The server deliberately sends `<img src=x onerror="alert('xss-img')">`.
 * DOMPurify strips the `onerror` attribute, but the <img> tag itself
 * would still render (as a broken image). To fully block injected image
 * tags from untrusted content we omit `img` from ALLOWED_TAGS entirely.
 * If images from trusted markdown are ever needed, re-evaluate per use-case.
 */

import MarkdownIt from 'markdown-it'
import DOMPurify from 'dompurify'

const md = new MarkdownIt({
  html: true,   // Allow HTML in markdown so we can then sanitize it
  linkify: true,
  breaks: true,
})

/**
 * Render markdown safely.
 * @param rawMarkdown - Untrusted markdown content (may include scripts, inline HTML)
 * @returns Safe HTML string suitable for dangerouslySetInnerHTML
 */
export function renderMarkdownSafely(rawMarkdown: string): string {
  // Step 1: Parse markdown to HTML (may contain injected HTML from untrusted source)
  const html = md.render(rawMarkdown)

  // Step 2: Sanitize HTML to remove scripts and dangerous elements/attributes.
  // ALLOWED_TAGS deliberately excludes <img> because the server sends an XSS
  // payload via img's onerror attribute and there is no legitimate use of
  // external images in these summaries.
  const sanitized = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li',
      'blockquote',
      'code', 'pre',
      'a',
    ],
    ALLOWED_ATTR: ['href', 'title', 'class'],
    KEEP_CONTENT: true, // Preserve text content even when its parent tag is stripped
  })

  return sanitized
}

/**
 * Test utility: verify that XSS payloads are blocked.
 * Only used for verification in tests or documentation.
 */
export function testXSSPrevention() {
  const testCases = [
    {
      name: 'Image onerror',
      input: '<img src=x onerror="alert(\'xss\')">',
    },
    {
      name: 'Script tag',
      input: '<script>alert("xss")</script>',
    },
    {
      name: 'Event handler',
      input: '<div onclick="alert(\'xss\')">click me</div>',
    },
  ]

  const results = testCases.map((tc) => ({
    name: tc.name,
    input: tc.input,
    output: renderMarkdownSafely(tc.input),
    blocked: !renderMarkdownSafely(tc.input).includes('onerror') &&
             !renderMarkdownSafely(tc.input).includes('<script'),
  }))

  return results
}
