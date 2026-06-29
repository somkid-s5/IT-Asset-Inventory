/**
 * Simple, lightweight HTML sanitizer to prevent stored XSS attacks.
 * Strips script tags, iframe tags, inline event handlers, and javascript: protocols.
 */
export function sanitizeHtml(html: string): string {
  if (!html) return html;

  let cleaned = html;

  // Remove <script>...</script> tags case-insensitively
  cleaned = cleaned.replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '');

  // Remove <iframe>...</iframe> tags case-insensitively
  cleaned = cleaned.replace(/<iframe[^>]*>([\s\S]*?)<\/iframe>/gi, '');

  // Remove event handlers starting with "on" (e.g. onload, onerror, onclick)
  cleaned = cleaned.replace(/\s+on\w+\s*=\s*(["'][^"']*["']|[^\s>]+)/gi, '');

  // Remove javascript: protocol links
  cleaned = cleaned.replace(
    /href\s*=\s*(["']\s*javascript:[^"']*["']|\s*javascript:[^\s>]+)/gi,
    'href="#"',
  );
  cleaned = cleaned.replace(
    /src\s*=\s*(["']\s*javascript:[^"']*["']|\s*javascript:[^\s>]+)/gi,
    'src="#"',
  );

  return cleaned;
}
