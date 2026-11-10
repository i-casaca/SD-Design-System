#!/usr/bin/env node
// Generates tokens/tokens.css from tokens/tokens.json (no dependencies).
//   node scripts/build-tokens.mjs
// Light is the default mode; Dark is only written where the value changes.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'tokens', 'tokens.json');
const out = path.join(root, 'tokens', 'tokens.css');

const flat = []; // { path, token }
const walk = (o, p = []) => {
  for (const [k, v] of Object.entries(o)) {
    if (k.startsWith('$') || !v || typeof v !== 'object') continue;
    if ('$value' in v) flat.push({ path: [...p, k], token: v });
    else walk(v, [...p, k]);
  }
};
walk(JSON.parse(fs.readFileSync(src, 'utf8')));

const varName = (p) => '--' + p.join('-');
const names = new Map();
for (const t of flat) {
  const n = varName(t.path);
  if (names.has(n)) throw new Error(`CSS name collision ${n}`);
  names.set(n, t);
}
const known = new Set(flat.map((t) => t.path.join('.')));
const resolve = (s) =>
  s.replace(/\{([^}]+)\}/g, (_, r) => {
    if (!known.has(r)) throw new Error(`Referencia rota {${r}}`);
    return `var(${varName(r.split('.'))})`;
  });

const shadow = (layers) =>
  layers.map((l) => `${l.inset ? 'inset ' : ''}${l.offsetX} ${l.offsetY} ${l.blur} ${l.spread} ${resolve(l.color)}`).join(', ');

const value = (t, mode) => {
  const v = mode && t.token.$extensions?.modes ? t.token.$extensions.modes[mode] : t.token.$value;
  switch (t.token.$type) {
    case 'shadow': return shadow(v);
    case 'typography': return null; // emitted separately
    default: return typeof v === 'string' ? resolve(v) : String(v);
  }
};

const light = [], dark = [], typo = [];
for (const t of flat) {
  const n = varName(t.path);
  if (t.token.$type === 'typography') {
    const v = t.token.$value;
    const base = n;
    typo.push(`  ${base}: ${resolve(v.fontWeight)} ${resolve(v.fontSize)}/${resolve(v.lineHeight)} ${resolve(v.fontFamily)};`);
    typo.push(`  ${base}-letter-spacing: ${resolve(v.letterSpacing)};`);
    continue;
  }
  light.push(`  ${n}: ${value(t, 'light')};`);
  if (t.token.$extensions?.modes) {
    const d = value(t, 'dark');
    if (d !== value(t, 'light')) dark.push(`  ${n}: ${d};`);
  }
}

const css = `/* GENERADO por scripts/build-tokens.mjs desde tokens/tokens.json. No editar a mano. */
/* Source: Figma Radix Themes (Community). Light by default; Dark with [data-theme="dark"] o .dark */

:root,
[data-theme="light"] {
  color-scheme: light;
${light.join('\n')}
${typo.join('\n')}
}

[data-theme="dark"],
.dark {
  color-scheme: dark;
${dark.join('\n')}
}
`;
fs.writeFileSync(out, css);
console.log(`${path.relative(root, out)}: ${light.length} variables (light), ${dark.length} change in dark, ${typo.length / 2} text styles`);
