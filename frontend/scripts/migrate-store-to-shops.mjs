/**
 * One-shot codemod: rewrite app/shops/[handle]/** to use a dynamic shop URL
 * base derived from `useParams()`, instead of hard-coded `/store/...` Links.
 *
 * For every .tsx file under app/shops/[handle]/:
 *   1. Ensures `useParams` is imported from `next/navigation`.
 *   2. Injects after the first `export default function X(...) {` (or first
 *      `function X(...) {` when there's a wrapper component pattern):
 *        const __shopParams = useParams() as { handle?: string };
 *        const __sb = `/shops/${__shopParams.handle ?? 'store'}`;
 *   3. Rewrites every `/store` reference inside string and template-literal
 *      contexts to use `__sb`.
 *
 * Run from frontend/: node scripts/migrate-store-to-shops.mjs
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'app/shops/[handle]';

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const s = statSync(full);
    if (s.isDirectory()) out.push(...walk(full));
    else if (full.endsWith('.tsx') || full.endsWith('.ts')) out.push(full);
  }
  return out;
}

function ensureImport(src) {
  // If `useParams` is already imported, leave it. Otherwise add an import line.
  if (/from\s+['"]next\/navigation['"]/.test(src)) {
    return src.replace(
      /(from\s+['"]next\/navigation['"]\s*[;\n])/,
      (m, p1) => {
        // Insert useParams into the existing import if missing.
        const block = src.slice(0, src.indexOf(m));
        const importStartIdx = block.lastIndexOf('import');
        const importBlock = src.slice(importStartIdx, src.indexOf(m) + m.length);
        if (importBlock.includes('useParams')) return p1;
        // Add useParams to the named-imports list.
        return importBlock.replace(/\{\s*([^}]*)\}/, (mm, names) => {
          if (names.includes('useParams')) return mm;
          const trimmed = names.trim().replace(/,$/, '');
          return `{ ${trimmed}, useParams }`;
        }) === importBlock ? p1 : '';
      }
    );
  }
  // Add a fresh import at the top after 'use client' or at very top.
  if (/^['"]use client['"];/.test(src.trim())) {
    return src.replace(
      /^(['"]use client['"];\s*)/,
      `$1\nimport { useParams } from 'next/navigation';\n`,
    );
  }
  return `import { useParams } from 'next/navigation';\n` + src;
}

// More robust: rebuild the entire next/navigation import.
function fixUseParamsImport(src) {
  const re = /import\s*\{([^}]*)\}\s*from\s*['"]next\/navigation['"]\s*;/;
  const m = re.exec(src);
  if (!m) {
    // Insert a fresh import after 'use client';
    if (/^['"]use client['"]\s*;/.test(src)) {
      return src.replace(
        /^(['"]use client['"]\s*;\s*\n?)/,
        `$1import { useParams } from 'next/navigation';\n`,
      );
    }
    return `import { useParams } from 'next/navigation';\n${src}`;
  }
  const names = m[1].split(',').map((s) => s.trim()).filter(Boolean);
  if (!names.includes('useParams')) names.push('useParams');
  const newImport = `import { ${names.join(', ')} } from 'next/navigation';`;
  return src.replace(re, newImport);
}

function injectHandleResolver(src) {
  // Inject the resolver right after the first `export default function NAME(...) {`
  // (or the first plain `function NAME(...) {` if no default).
  if (src.includes('const __sb =')) return src;

  const re = /(export\s+default\s+function\s+\w+\s*\([^)]*\)\s*\{)/;
  if (re.test(src)) {
    return src.replace(
      re,
      `$1\n  const __shopParams = useParams() as { handle?: string };\n  const __sb = \`/shops/\${__shopParams.handle ?? 'store'}\`;\n`,
    );
  }
  // Fallback: first plain function.
  const re2 = /(function\s+\w+\s*\([^)]*\)\s*\{)/;
  if (re2.test(src)) {
    return src.replace(
      re2,
      `$1\n  const __shopParams = useParams() as { handle?: string };\n  const __sb = \`/shops/\${__shopParams.handle ?? 'store'}\`;\n`,
    );
  }
  return src;
}

function rewriteStoreLinks(src) {
  let out = src;

  // Pattern A: href="/store/X" or href='/store/X' inside JSX → href={`${__sb}/X`}
  out = out.replace(/(\bhref|\baction|\bto)\s*=\s*"\/store(\/[^"]*)"/g, (_m, attr, rest) => {
    return `${attr}={\`\${__sb}${rest}\`}`;
  });
  out = out.replace(/(\bhref|\baction|\bto)\s*=\s*'\/store(\/[^']*)'/g, (_m, attr, rest) => {
    return `${attr}={\`\${__sb}${rest}\`}`;
  });

  // Pattern B: href="/store" exact → href={__sb}
  out = out.replace(/(\bhref|\baction|\bto)\s*=\s*"\/store"/g, (_m, attr) => `${attr}={__sb}`);
  out = out.replace(/(\bhref|\baction|\bto)\s*=\s*'\/store'/g, (_m, attr) => `${attr}={__sb}`);

  // Pattern C: inside backtick template literals — `/store/X` → `${__sb}/X`
  // (Match any /store/ inside a backticked string.)
  out = out.replace(/`(.*?)\/store(\/[^`]*)`/g, (_m, prefix, rest) => `\`${prefix}\${__sb}${rest}\``);
  // `/store` exact inside backticks → `${__sb}`
  out = out.replace(/`(\s*)\/store(\s*)`/g, (_m, a, b) => `\`${a}\${__sb}${b}\``);

  // Pattern D: inside plain JS strings — '/store/X' or "/store/X" used in
  // non-attribute contexts (router.push, redirect, etc.). Keep these
  // template-literal too.
  out = out.replace(/(['"])\/store(\/[^'"]*)\1/g, (_m, _q, rest) => {
    return `\`\${__sb}${rest}\``;
  });
  out = out.replace(/(['"])\/store\1/g, () => `__sb`);

  return out;
}

function processFile(file) {
  const src = readFileSync(file, 'utf8');
  let out = src;

  // Skip files that have no /store reference at all.
  if (!/\/store/.test(out)) return false;

  out = fixUseParamsImport(out);
  out = injectHandleResolver(out);
  out = rewriteStoreLinks(out);

  if (out !== src) {
    writeFileSync(file, out, 'utf8');
    return true;
  }
  return false;
}

const files = walk(ROOT);
let changed = 0;
for (const f of files) {
  if (processFile(f)) {
    changed++;
    console.log('  rewrote', f);
  }
}
console.log(`Done. ${changed}/${files.length} files updated.`);
