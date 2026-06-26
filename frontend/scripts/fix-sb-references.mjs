/**
 * Walks every file under app/shops/[handle]/ and ensures any FUNCTION
 * COMPONENT that references `__sb` declares it via the shared `useShopBase()`
 * hook. Inner closures (`.map(p => ...)`) inherit `__sb` via lexical scope —
 * we MUST NOT inject the hook there (Rules of Hooks).
 *
 * Rules:
 *   - Match `function ComponentName(...)` declarations (capitalised) only.
 *   - Skip arrow-function callbacks completely.
 *   - Per function body: if it references `__sb` and the declaration isn't
 *     already there, prepend `const __sb = useShopBase();`.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'app/shops/[handle]';

function walk(dir) {
  const out = [];
  for (const e of readdirSync(dir)) {
    const f = join(dir, e);
    const s = statSync(f);
    if (s.isDirectory()) out.push(...walk(f));
    else if (f.endsWith('.tsx') || f.endsWith('.ts')) out.push(f);
  }
  return out;
}

function ensureUseShopBaseImport(src) {
  if (/from\s+['"]@\/lib\/use-shop-base['"]/.test(src)) return src;
  const useClient = /^['"]use client['"]\s*;\s*\n/m.exec(src);
  if (useClient) {
    return src.slice(0, useClient.index + useClient[0].length)
      + `import { useShopBase } from '@/lib/use-shop-base';\n`
      + src.slice(useClient.index + useClient[0].length);
  }
  return `import { useShopBase } from '@/lib/use-shop-base';\n${src}`;
}

/**
 * Scrub any incorrect injections into arrow-function callbacks. They look
 * like `=> {\n  const __sb = useShopBase();\n` — strip that exact pattern.
 */
function stripBadInjections(src) {
  return src.replace(/(=>\s*\{)\s*\n\s*const\s+__sb\s*=\s*useShopBase\(\);\s*\n/g, '$1\n');
}

/**
 * Find every `function ComponentName(...) {` (function name starts with an
 * uppercase letter) and inject `const __sb = useShopBase();` if missing.
 */
function balancedCloseParen(src, openIdx) {
  let depth = 0;
  for (let i = openIdx; i < src.length; i++) {
    const c = src[i];
    if (c === '(') depth++;
    else if (c === ')') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function injectIntoComponents(src) {
  // Find every `function NAME(` where NAME starts with uppercase. For each,
  // walk the `(` to its matching `)` (handling nested parens like
  // `() => void` in type annotations), then advance past whitespace +
  // optional `: ReturnType` to the body's `{`. Inject the hook at the start
  // of the body if missing.
  const re = /\bfunction\s+[A-Z][\w$]*\s*\(/g;
  let out = '';
  let last = 0;
  let m;
  while ((m = re.exec(src)) !== null) {
    const openParenIdx = m.index + m[0].length - 1;
    const closeParenIdx = balancedCloseParen(src, openParenIdx);
    if (closeParenIdx < 0) continue;

    let bodyOpenIdx = closeParenIdx + 1;
    while (bodyOpenIdx < src.length && src[bodyOpenIdx] !== '{') bodyOpenIdx++;
    if (bodyOpenIdx >= src.length) continue;

    let depth = 1;
    let p = bodyOpenIdx + 1;
    while (p < src.length && depth > 0) {
      if (src[p] === '{') depth++;
      else if (src[p] === '}') depth--;
      if (depth === 0) break;
      p++;
    }
    const body = src.slice(bodyOpenIdx + 1, p);
    if (!/\b__sb\b/.test(body) || /\bconst\s+__sb\s*=/.test(body)) continue;

    out += src.slice(last, bodyOpenIdx + 1);
    out += `\n  const __sb = useShopBase();\n`;
    last = bodyOpenIdx + 1;
  }
  out += src.slice(last);
  return out;
}

function processFile(file) {
  const src = readFileSync(file, 'utf8');
  if (!/\b__sb\b/.test(src)) return false;

  let next = src;
  // Get rid of any wrong injections from the previous pass.
  next = stripBadInjections(next);
  // Remove the legacy resolver line so we always converge on useShopBase().
  next = next.replace(
    /\s*const __shopParams = useParams\(\)[^;]*;\s*const __sb = `\/shops\/\$\{__shopParams\.handle \?\? 'store'\}`;/g,
    '',
  );
  // Drop now-unused `useParams` import (we'll re-add via useShopBase).
  // Leave it if other code uses it.
  if (!/\buseParams\s*\(/.test(next.replace(/from\s+['"]next\/navigation['"]/g, ''))) {
    next = next.replace(
      /import\s*\{\s*([^}]*)\}\s*from\s*['"]next\/navigation['"]\s*;/,
      (mm, names) => {
        const list = names.split(',').map((s) => s.trim()).filter((s) => s && s !== 'useParams');
        if (list.length === 0) return '';
        return `import { ${list.join(', ')} } from 'next/navigation';`;
      },
    );
  }
  next = ensureUseShopBaseImport(next);
  next = injectIntoComponents(next);

  if (next !== src) {
    writeFileSync(file, next, 'utf8');
    return true;
  }
  return false;
}

const files = walk(ROOT);
let changed = 0;
for (const f of files) {
  if (processFile(f)) {
    changed++;
    console.log('  fixed', f);
  }
}
console.log(`Done. ${changed}/${files.length} files updated.`);
