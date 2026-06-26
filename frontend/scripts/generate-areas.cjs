/**
 * One-shot generator: parses the inspiration codebase's AreaSeeder.php
 * (~1,088 rows of district / thana / area / postal_code) and emits a
 * TypeScript data file we can import directly. Run from the project root:
 *
 *   node frontend/scripts/generate-areas.cjs
 *
 * Output: frontend/lib/bangladesh-areas.generated.ts
 */
const fs = require('fs');
const path = require('path');

const SEEDER_PATH = path.resolve(
  __dirname,
  '../../inspiration for funtionality only, dont follow design/glowup-front-back-end/backend/database/seeders/AreaSeeder.php',
);
const OUT_PATH = path.resolve(__dirname, '../lib/bangladesh-areas.generated.ts');

const text = fs.readFileSync(SEEDER_PATH, 'utf-8');

// Robust line-level regex — handles names with apostrophes (e.g. "Cox's Bazar")
// and double-quoted name fields. We don't care about lat/lng for the dropdown.
const rowRegex =
  /\['district'\s*=>\s*'([^']+)',\s*'thana'\s*=>\s*'([^']+)',\s*'name'\s*=>\s*(?:'((?:\\'|[^'])*)'|"((?:\\"|[^"])*)")\s*,\s*'postal_code'\s*=>\s*'(\d+)'/g;

const rows = [];
let m;
while ((m = rowRegex.exec(text)) !== null) {
  rows.push({
    district: m[1].trim(),
    thana: m[2].trim(),
    name: (m[3] ?? m[4] ?? '').replace(/\\'/g, "'").replace(/\\"/g, '"').trim(),
    postal_code: m[5],
  });
}

console.log('Parsed rows:', rows.length);
if (rows.length === 0) {
  console.error('No rows parsed — regex may be out of date.');
  process.exit(1);
}

// Build nested map: district -> thana -> Array<{name, postal_code}>
const map = {};
for (const row of rows) {
  if (!map[row.district]) map[row.district] = {};
  if (!map[row.district][row.thana]) map[row.district][row.thana] = [];
  // Skip duplicates inside the same thana (same name + same postal).
  const exists = map[row.district][row.thana].some(
    (a) => a.name === row.name && a.postal_code === row.postal_code,
  );
  if (!exists) {
    map[row.district][row.thana].push({ name: row.name, postal_code: row.postal_code });
  }
}

// Sort thanas alphabetically and areas alphabetically within each thana.
for (const district of Object.keys(map)) {
  const sorted = {};
  for (const thana of Object.keys(map[district]).sort()) {
    sorted[thana] = map[district][thana].sort((a, b) => a.name.localeCompare(b.name));
  }
  map[district] = sorted;
}

const districtCount = Object.keys(map).length;
const thanaCount = Object.values(map).reduce((sum, t) => sum + Object.keys(t).length, 0);
const areaCount = Object.values(map).reduce(
  (sum, t) => sum + Object.values(t).reduce((s, arr) => s + arr.length, 0),
  0,
);

const header = `/* eslint-disable */
// THIS FILE IS GENERATED — run \`node frontend/scripts/generate-areas.cjs\` to regenerate.
// Source: glowup-front-back-end/backend/database/seeders/AreaSeeder.php
//
// Hierarchy: district -> thana -> Area[].
// Stats: ${districtCount} districts · ${thanaCount} thanas · ${areaCount} areas.
//
// Note: this is the *legacy* spelling from the seeder ("Barisal", "Comilla",
// "Chittagong"); the canonical names in bangladesh-locations.ts use the new
// official spellings ("Barishal", "Cumilla", "Chattogram"). Helpers below
// alias both spellings so a saved address from either era resolves.

export interface Area {
  name: string;
  postal_code: string;
}

export const areasByDistrictThana: Record<string, Record<string, Area[]>> = ${JSON.stringify(map, null, 2)};
`;

fs.writeFileSync(OUT_PATH, header, 'utf-8');
console.log('Wrote', OUT_PATH);
console.log(`  ${districtCount} districts · ${thanaCount} thanas · ${areaCount} areas`);
