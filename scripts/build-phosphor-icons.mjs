#!/usr/bin/env node
// Generates the Phosphor icon re-export file from icons/phosphor/registry.json (no dependencies).
//   node scripts/build-phosphor-icons.mjs [output-path]
// Por defecto: icons/phosphor/icons.ts. En un proyecto Next.js: node design-system/scripts/build-phosphor-icons.mjs src/components/icon/icons.ts
// The package exports "ArrowRightIcon"; here it is re-exported as "ArrowRight", as with Lucide,
// so components do not change if a project switches from one library to the other.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const reg = JSON.parse(fs.readFileSync(path.join(root, 'icons', 'phosphor', 'registry.json'), 'utf8'));
const out = path.resolve(process.argv[2] ?? path.join(root, 'icons', 'phosphor', 'icons.ts'));

const names = reg.icons.map((i) => i.name);
const bad = names.filter((n) => !/^[A-Z][A-Za-z0-9]*$/.test(n) || n.endsWith('Icon'));
if (bad.length) throw new Error(`Invalid names (PascalCase, without the Icon suffix): ${bad.join(', ')}`);
if (new Set(names).size !== names.length) throw new Error('Nombres duplicados en icons/phosphor/registry.json');
const sorted = [...names].sort();

// /ssr: no React Context, works in Next.js Server and Client Components.
const src = `/* GENERADO por scripts/build-phosphor-icons.mjs desde icons/phosphor/registry.json. No editar a mano. */
import { ${sorted.map((n) => `${n}Icon`).join(', ')} } from '${reg.library}/ssr';

export type { Icon as PhosphorIcon, IconWeight } from '${reg.library}';
export const weights = ${JSON.stringify(reg.weights)} as const;
export { ${sorted.map((n) => `${n}Icon as ${n}`).join(', ')} };
`;
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, src);
console.log(`${path.relative(process.cwd(), out)}: ${sorted.length} icons`);
