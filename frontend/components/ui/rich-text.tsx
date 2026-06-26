'use client';

/**
 * Renders HTML content from a rich-text editor (vendor product descriptions,
 * blog bodies, store about-text, etc.) safely-ish for display.
 *
 * Why: vendors author descriptions in a WYSIWYG that emits real HTML
 * (`<p>`, `<strong>`, `<ul>`, `<h4>`, `<a>`, ...). Rendering as plain text
 * shows the literal tags. We use `dangerouslySetInnerHTML` so the markup is
 * interpreted, and apply a `prose` style block scoped to this element so the
 * output looks reasonable inside any theme.
 *
 * Trust model: the HTML originates from authenticated vendors editing their
 * own store. We do a basic strip of `<script>`/`<style>` and inline event
 * handlers so a compromised vendor account can't trivially XSS shoppers.
 * Production should layer a proper sanitiser (DOMPurify) on top — kept light
 * here to avoid pulling another dependency.
 */
function lightSanitize(html: string): string {
  if (!html) return '';
  return html
    // Drop <script>/<style>...</style> tags entirely.
    .replace(/<\/?(script|style)[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<\/?(script|style)[^>]*>/gi, '')
    // Strip inline event handlers and `javascript:` URLs.
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
    .replace(/(href|src)\s*=\s*"\s*javascript:[^"]*"/gi, '$1="#"')
    .replace(/(href|src)\s*=\s*'\s*javascript:[^']*'/gi, "$1='#'");
}

export function RichText({
  html,
  className = '',
  fallback = null,
}: {
  html: string | null | undefined;
  className?: string;
  fallback?: React.ReactNode;
}) {
  const trimmed = (html ?? '').trim();
  if (!trimmed) return <>{fallback}</>;
  return (
    <div
      className={`rich-text ${className}`}
      dangerouslySetInnerHTML={{ __html: lightSanitize(trimmed) }}
    />
  );
}
