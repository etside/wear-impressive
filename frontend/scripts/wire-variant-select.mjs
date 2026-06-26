#!/usr/bin/env node
/**
 * Wire variant buttons in every theme's ProductDetail:
 *   - onClick → onSelectOption?.(label, value)
 *   - data-selected attribute (for CSS override if a theme wants it)
 *   - inline style when selected — bulletproof across themes' custom classes
 *
 * Safe to re-run (regex strips any prior onClick/data-selected/style injection).
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const themesDir = join(__dirname, '..', 'lib', 'themes');
const files = readdirSync(themesDir, { withFileTypes: true })
  .filter(e => e.isDirectory())
  .map(e => join(themesDir, e.name, 'index.tsx'));

let updated = 0, skipped = 0;

for (const file of files) {
  let src;
  try { src = readFileSync(file, 'utf8'); } catch { continue; }

  if (!src.includes('const ProductDetail: React.FC<ThemeProductDetailProps>')) {
    skipped++; continue;
  }

  // 1) Inject the 3 new props into the destructure (once).
  const destEndRe = /(const ProductDetail: React\.FC<ThemeProductDetailProps> = \(\{[\s\S]*?)(\n\}\)\s*=>)/;
  src = src.replace(destEndRe, (_, head, close) => {
    if (head.includes('selectedOptions')) return head + close;
    return head + '\n  selectedOptions = {},\n  onSelectOption,\n  isOutOfStock,' + close;
  });

  // 2) Rewrite each variant button. Match:
  //    {v.values.map((val) => (<button ...>{val}</button>))}
  // Use [\s\S]*? inside attrs to span newlines.
  const btnRe = /(\{v\.values\.map\(\(val\) => \(\s*)<button([\s\S]*?)>\s*\{val\}\s*<\/button>/g;

  src = src.replace(btnRe, (_whole, pre, attrs) => {
    // Strip any earlier onClick/data-selected/style we may have previously injected.
    attrs = attrs
      .replace(/\s*onClick=\{[^}]*\}/g, '')
      .replace(/\s*data-selected=\{[^}]*\}/g, '')
      .replace(/\s*style=\{selectedOptions\[v\.label\][\s\S]*?\}\}/g, '')
      .replace(/\s*\n/g, '\n');

    return `${pre}<button${attrs}\n                  onClick={() => onSelectOption?.(v.label, val)}\n                  data-selected={selectedOptions[v.label] === val ? 'true' : undefined}\n                  style={selectedOptions[v.label] === val ? { backgroundColor: '#111827', color: '#ffffff', borderColor: '#111827' } : undefined}\n                >{val}</button>`;
  });

  writeFileSync(file, src);
  updated++;
  console.log('  wired', file.replace(themesDir, ''));
}

console.log(`\nDone. Wired: ${updated}  Skipped: ${skipped}`);
