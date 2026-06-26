/**
 * Theme link rewriter. Maps every legacy storefront URL pattern in
 * lib/themes/*\/index.tsx to the dynamic shopBase()-prefixed form.
 *
 *   /product/${id}                  → ${shopBase()}/products/${id}
 *   /products/${id}                 → ${shopBase()}/products/${id}
 *   /store/products/${id}           → ${shopBase()}/products/${id}
 *   /category/<x>                   → ${shopBase()}/products?category=<x>
 *   /categories/<x>                 → ${shopBase()}/products?category=<x>
 *   /store/<rest>                   → ${shopBase()}/<rest>
 *
 * Adds the import if missing. Non-hook helper, so safe to call inline anywhere.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'lib/themes';

function ensureShopBaseImport(src) {
  if (/from\s+['"]@\/lib\/use-shop-base['"]/.test(src)) {
    return src.replace(
      /import\s*\{\s*([^}]*)\}\s*from\s*['"]@\/lib\/use-shop-base['"]\s*;/,
      (mm, names) => {
        const list = names.split(',').map((s) => s.trim()).filter(Boolean);
        if (!list.includes('shopBase')) list.push('shopBase');
        return `import { ${list.join(', ')} } from '@/lib/use-shop-base';`;
      },
    );
  }
  if (/^['"]use client['"]\s*;\s*\n/m.test(src)) {
    return src.replace(
      /^(['"]use client['"]\s*;\s*\n)/m,
      `$1import { shopBase } from '@/lib/use-shop-base';\n`,
    );
  }
  return `import { shopBase } from '@/lib/use-shop-base';\n${src}`;
}

function rewrite(src) {
  let out = src;

  // 1) Inside template literals — most common in themes.
  // `/product/${id}` → `${shopBase()}/products/${id}`
  out = out.replace(/`(.*?)\/product\/(\$\{[^}]+\})`/g,
    (_m, prefix, id) => `\`${prefix}\${shopBase()}/products/${id}\``);
  // `/products/${id}` → `${shopBase()}/products/${id}`  (no /store prefix)
  out = out.replace(/`(.*?)\/products\/(\$\{[^}]+\})`/g,
    (_m, prefix, id) => `\`${prefix}\${shopBase()}/products/${id}\``);
  // `/store/products/...` → `${shopBase()}/products/...`
  out = out.replace(/`(.*?)\/store\/products\b/g,
    (_m, prefix) => `\`${prefix}\${shopBase()}/products`);
  // `/categories/<X>` → `${shopBase()}/products?category=<X>`
  out = out.replace(/`(.*?)\/categories\/(\$\{[^}]+\}|[^`]+?)`/g,
    (_m, prefix, slug) => `\`${prefix}\${shopBase()}/products?category=${slug}\``);
  // `/category/<X>`   → `${shopBase()}/products?category=<X>`
  out = out.replace(/`(.*?)\/category\/(\$\{[^}]+\}|[^`]+?)`/g,
    (_m, prefix, slug) => `\`${prefix}\${shopBase()}/products?category=${slug}\``);
  // Generic `/store/...`
  out = out.replace(/`(.*?)\/store(\/[^`]*)`/g,
    (_m, prefix, rest) => `\`${prefix}\${shopBase()}${rest}\``);

  // 2) JSX attributes with double quotes
  out = out.replace(/(\bhref|\bto|\baction)\s*=\s*"\/store(\/[^"]*)"/g,
    (_m, attr, rest) => `${attr}={\`\${shopBase()}${rest}\`}`);
  out = out.replace(/(\bhref|\bto|\baction)\s*=\s*"\/store"/g,
    (_m, attr) => `${attr}={shopBase()}`);
  out = out.replace(/(\bhref|\bto|\baction)\s*=\s*"\/products(\/[^"]*)"/g,
    (_m, attr, rest) => `${attr}={\`\${shopBase()}/products${rest}\`}`);

  // 3) Plain string literals in JS — keep last so we don't double-replace.
  out = out.replace(/(['"])\/store(\/[^'"]*)\1/g,
    (_m, _q, rest) => `\`\${shopBase()}${rest}\``);

  return out;
}

const themes = readdirSync(ROOT).filter((d) => statSync(join(ROOT, d)).isDirectory());
let changed = 0;
for (const theme of themes) {
  const file = join(ROOT, theme, 'index.tsx');
  let src;
  try { src = readFileSync(file, 'utf8'); } catch { continue; }

  const hasLegacy = /\/(product|products|category|categories|store)\b/.test(src);
  if (!hasLegacy) continue;

  let next = rewrite(src);
  next = ensureShopBaseImport(next);

  if (next !== src) {
    writeFileSync(file, next, 'utf8');
    console.log('  rewrote', file);
    changed++;
  }
}
console.log(`Done. ${changed}/${themes.length} themes updated.`);
