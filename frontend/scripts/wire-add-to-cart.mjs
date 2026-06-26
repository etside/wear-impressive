#!/usr/bin/env node
/**
 * One-time script: wire the "Add to Cart" button in every theme's
 * ProductDetail component to call the optional `onAddToCart` prop.
 *
 * Run:  node scripts/wire-add-to-cart.mjs
 * Idempotent: skips files that already reference `onAddToCart`.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const themesDir = join(__dirname, '..', 'lib', 'themes');
const files = readdirSync(themesDir, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => join(themesDir, e.name, 'index.tsx'));

let updated = 0, skipped = 0;

for (const file of files) {
  let src;
  try { src = readFileSync(file, 'utf8'); } catch { continue; }

  if (src.includes('onAddToCart')) { skipped++; continue; }

  // Locate the ProductDetail component block — we only patch inside it so the
  // ProductCard "Add" button stays untouched.
  const blockStart = src.indexOf('const ProductDetail: React.FC<ThemeProductDetailProps>');
  if (blockStart === -1) { skipped++; continue; }

  // Heuristic end: next top-level component declaration or EOF.
  const tail = src.slice(blockStart);
  const nextDecl = tail.slice(40).search(/\n(?:const|function) \w+: React\.FC|\nexport /);
  const blockEnd = nextDecl === -1 ? src.length : blockStart + 40 + nextDecl;
  const before = src.slice(0, blockStart);
  const block = src.slice(blockStart, blockEnd);
  const after = src.slice(blockEnd);

  // 1. Extend destructure: inject `onAddToCart, isAddingToCart,` before `}) =>`.
  let newBlock = block.replace(
    /(const ProductDetail: React\.FC<ThemeProductDetailProps> = \(\{[\s\S]*?)(\n\}\)\s*=>)/,
    (_, head, close) => `${head}\n  onAddToCart,\n  isAddingToCart,${close}`
  );

  // 2. Wire the "Add to Cart" / "Add to Bag" button. A single <button> may not
  // nest — use a negative lookahead so `[\s\S]` cannot cross `</button>`.
  const btnPattern = /<button((?:(?!onClick=)[^>])*?)>((?:(?!<\/button>)[\s\S])*?(?:Add to Cart|Add to Bag)(?:(?!<\/button>)[\s\S])*?)<\/button>/;
  const m = btnPattern.exec(newBlock);
  if (!m) { skipped++; continue; }

  const fullMatch = m[0];
  const openingAttrs = m[1];
  const inner = m[2];

  const patchedInner = inner
    .replace(/Add to Cart/g, "{isAddingToCart ? 'Adding...' : 'Add to Cart'}")
    .replace(/Add to Bag/g, "{isAddingToCart ? 'Adding...' : 'Add to Bag'}");

  const patchedBtn = `<button${openingAttrs} onClick={onAddToCart} disabled={isAddingToCart}>${patchedInner}</button>`;
  newBlock = newBlock.replace(fullMatch, patchedBtn);

  writeFileSync(file, before + newBlock + after);
  updated++;
  console.log(`  wired  ${file.replace(themesDir, '')}`);
}

console.log(`\nDone. Wired: ${updated}  Skipped: ${skipped}`);
