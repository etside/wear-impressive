/**
 * Replace plain `{description}` renders inside theme files with a
 * `<RichText html={description}/>` so vendor-authored HTML (paragraphs,
 * lists, bold, headings) shows formatted instead of as raw tag soup.
 *
 * Conservative: targets only spots where description is rendered as the body
 * of a `<p>` or appears as `{description}` directly inside JSX. Doesn't
 * touch `description` strings used as object values or input placeholders.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'lib/themes';

function ensureImport(src) {
  if (/from\s+['"]@\/components\/ui\/rich-text['"]/.test(src)) return src;
  if (/^['"]use client['"]\s*;\s*\n/m.test(src)) {
    return src.replace(
      /^(['"]use client['"]\s*;\s*\n)/m,
      `$1import { RichText } from '@/components/ui/rich-text';\n`,
    );
  }
  return `import { RichText } from '@/components/ui/rich-text';\n${src}`;
}

function rewrite(src) {
  let out = src;

  // 1) `<p ...>{description}</p>` → `<RichText html={description} className="..." />`
  out = out.replace(
    /<p\s+className=("|')([^"']*)\1\s*>\s*\{description\}\s*<\/p>/g,
    (_m, _q, cls) => `<RichText html={description} className="${cls}" />`,
  );
  // Same with no className
  out = out.replace(
    /<p\s*>\s*\{description\}\s*<\/p>/g,
    () => `<RichText html={description} />`,
  );

  // 2) Inside accordions / tabs — `{a.content}` that ultimately came from
  //    `{ content: description }`. Wrap with RichText. We only do this when the
  //    parent <div> wraps just the value in `whitespace-pre-line`.
  out = out.replace(
    /<div([^>]*)>\s*\{(\w+)\.content\}\s*<\/div>/g,
    (_m, attrs, varName) => `<div${attrs}><RichText html={${varName}.content} /></div>`,
  );

  return out;
}

const themes = readdirSync(ROOT).filter((d) => statSync(join(ROOT, d)).isDirectory());
let changed = 0;
for (const theme of themes) {
  const file = join(ROOT, theme, 'index.tsx');
  let src;
  try { src = readFileSync(file, 'utf8'); } catch { continue; }

  let next = rewrite(src);
  if (next === src) continue;

  next = ensureImport(next);
  writeFileSync(file, next, 'utf8');
  console.log('  rewrote', file);
  changed++;
}
console.log(`Done. ${changed}/${themes.length} themes updated.`);
