import MarkdownIt from 'markdown-it';
import DOMPurify from 'dompurify';

const md = new MarkdownIt({
  html: true,
  linkify: true,
  breaks: true,
});

export function renderMarkdownSafely(rawMarkdown: string): string {
  const html = md.render(rawMarkdown);

  // Sanitize the HTML. We deliberately exclude 'img' tags to block the mock server's XSS payload.
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li',
      'blockquote',
      'code', 'pre',
      'a',
    ],
    ALLOWED_ATTR: ['href', 'title', 'class'],
    KEEP_CONTENT: true,
  });
}
