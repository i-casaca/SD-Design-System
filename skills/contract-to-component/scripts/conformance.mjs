#!/usr/bin/env node
// Checks that a component (tsx + module.css) conforms to its contract. No dependencies.
//   node conformance.mjs <component-folder> [--contract <ruta>] [--ds <root>]
// The folder contains <id>.tsx, <id>.module.css and <Name>.contract.json (copy of the contract).
// Exits with code 1 if there are errors. Warnings do not fail.
import fs from 'node:fs';
import path from 'node:path';
import { kebab, readJson, findRoot, loadTokenNames, toVarName, propInfo, boundTokens, numericValues } from './lib.mjs';

const args = process.argv.slice(2);
const opt = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const dir = args.find((a) => !a.startsWith('--') && a !== opt('--contract') && a !== opt('--ds'));
if (!dir || !fs.existsSync(dir)) { console.error('Usage: node conformance.mjs <component-folder> [--contract path] [--ds root]'); process.exit(2); }

const errors = [], warnings = [];
const err = (m) => errors.push(m), warn = (m) => warnings.push(m);
const files = fs.readdirSync(dir);
const copyName = files.find((f) => f.endsWith('.contract.json'));
if (!copyName) { console.error(`No *.contract.json in ${dir}: copy the contract next to the component.`); process.exit(2); }
const copy = readJson(path.join(dir, copyName));
const root = findRoot(opt('--ds'));
const sourcePath = opt('--contract') ?? (root ? path.join(root, 'contracts', copyName) : null);
const id = copy.id ?? kebab(copy.name);
const tsxName = files.find((f) => f === `${id}.tsx`) ?? files.find((f) => f.endsWith('.tsx') && !f.endsWith('.test.tsx'));
const cssName = files.find((f) => f === `${id}.module.css`) ?? files.find((f) => f.endsWith('.module.css'));
if (!tsxName) err(`missing ${id}.tsx`);
if (!cssName) err(`missing ${id}.module.css`);
if (!tsxName || !cssName) { for (const e of errors) console.log('ERROR  ', e); process.exit(1); }
const tsx = fs.readFileSync(path.join(dir, tsxName), 'utf8');
const css = fs.readFileSync(path.join(dir, cssName), 'utf8');
const c = copy;
const Name = c.name;
const { enums, bools } = propInfo(c);

// 1. The copy is identical to the source contract and the version is noted
if (sourcePath && fs.existsSync(sourcePath)) {
  if (JSON.stringify(readJson(sourcePath)) !== JSON.stringify(copy)) err(`${copyName} is not identical to ${path.relative(process.cwd(), sourcePath)}: copy it again (or bump the version in the contract)`);
} else warn('cannot find the source contract to compare the copy (use --contract or --ds)');
const header = tsx.match(/@contract\s+(\w+)@(\d+\.\d+\.\d+)/);
if (!header) err(`missing the comment "@contract ${Name}@${c.version}" at the top of the tsx`);
else if (header[1] !== Name || header[2] !== c.version) err(`the tsx says @contract ${header[1]}@${header[2]}; the contract is ${Name}@${c.version}`);

// 2. Export and props type
if (!new RegExp(`export\\s+(?:default\\s+)?(?:function|const)\\s+${Name}\\b`).test(tsx)) err(`missing "export function ${Name}" (named export)`);
const propsRe = new RegExp(`export\\s+(?:interface|type)\\s+${Name}Props\\b`);
const pm = propsRe.exec(tsx);
if (!pm) err(`missing "export interface ${Name}Props"`);
else {
  const start = tsx.indexOf('{', pm.index + pm[0].length);
  let depth = 0, end = start;
  for (let i = start; i < tsx.length; i++) { if (tsx[i] === '{') depth++; else if (tsx[i] === '}' && --depth === 0) { end = i; break; } }
  const body = tsx.slice(start + 1, end);
  const keys = new Map(); depth = 0;
  for (const line of body.split('\n')) {
    if (depth === 0) { const m = line.match(/^\s*(?:readonly\s+)?(['"]?)([\w-]+)\1\??\s*:/); if (m) keys.set(m[2], line); }
    for (const ch of line) { if ('{(['.includes(ch)) depth++; else if ('})]'.includes(ch)) depth--; }
  }
  const names = (c.props ?? []).map((p) => p.name);
  for (const n of names) if (!keys.has(n)) {
    const inherited = /\bextends\b|=\s*(Omit|Pick|React|Component|Html|Button|Anchor)/.test(tsx.slice(pm.index, start)) && /^(aria-|on[A-Z]|children$|type$|disabled$)/.test(n);
    if (inherited && new RegExp(`\\b${n.replace('-', '\\-')}\\b`).test(tsx)) warn(`prop "${n}" is not declared in ${Name}Props; it is inherited from the native element. Declare it explicitly so the type reflects the contract`);
    else err(`contract prop "${n}" is not in ${Name}Props`);
  }
  const allowed = new Set([...names, 'ref']);
  for (const k of keys.keys()) if (!allowed.has(k)) (k === 'className' ? warn : err)(`prop "${k}" in ${Name}Props does not exist in the contract (do not add props)`);
  for (const [n, vals] of Object.entries(enums)) { const line = keys.get(n); if (line) for (const v of vals) if (!line.includes(`'${v}'`) && !line.includes(`"${v}"`)) err(`${Name}Props.${n} does not accept "${v}"`); }
  for (const p of c.props ?? []) {
    const optional = keys.get(p.name)?.includes('?:');
    if (p.required && keys.has(p.name) && optional) err(`"${p.name}" is required in the contract and optional here`);
    if (!p.required && keys.has(p.name) && !optional && p.default !== undefined) warn(`"${p.name}" has a default in the contract; mark it optional (?)`);
    if (p.default !== undefined && p.default !== null && !p.required) {
      const d = String(p.default).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (!new RegExp(`\\b${p.name.replace('-', '\\-')}\\s*(?::\\s*[\\w$]+\\s*)?=\\s*['"]?${d}['"]?\\b`).test(tsx)) warn(`cannot see the default value of "${p.name}" (${p.default}) in the component`);
    }
  }
}

// 3. Parts, ref and controlled states
for (const [part, def] of Object.entries(c.anatomy ?? {})) {
  if (def.element === 'css') continue;
  if (!new RegExp(`data-part=["'{]+\\s*${part}\\b`).test(tsx)) (def.optional || def.slot ? warn : err)(`missing data-part="${part}"`);
}
if (c.semantics?.refTarget && !/\bref\b/.test(tsx)) warn(`cannot see "ref"; it must go on the part "${c.semantics.refTarget}"`);
for (const s of c.states?.controlled ?? []) {
  for (const a of String(s.aria ?? '').match(/aria-[a-z-]+/g) ?? []) if (!tsx.includes(a)) err(`state "${s.name}": missing ${a} in the tsx`);
  if (/native HTML attribute/.test(s.aria ?? '') && !new RegExp(`\\b${s.name}\\b`).test(tsx)) err(`state "${s.name}": missing native attribute ${s.name}`);
}

// 4. Code rules
if (/:\s*any\b|\bas any\b|<any>/.test(tsx)) err('there is "any" in the tsx');
if (/style=\{\{/.test(tsx)) err('inline styles (style={{…}}): use the CSS Module');
if (/from\s+['"]lucide-react['"]/.test(tsx)) err('direct lucide-react import: use the registry icons');
if (/\bhooks?\b|useState|useEffect|useRef|useReducer|onClick|onChange/.test(tsx) && !/^\s*['"]use client['"]/m.test(tsx) && /useState|useEffect|useRef|useReducer/.test(tsx)) err('uses hooks but "use client" is missing');

// 5. data-* attributes used in the CSS ↔ tsx, and variants covered
const cssAttrs = new Set([...css.matchAll(/\[data-([a-z-]+)/g)].map((m) => m[1]));
for (const a of cssAttrs) if (a !== 'part' && !new RegExp(`data-${a}\\b`).test(tsx)) err(`the CSS uses [data-${a}] but the tsx does not set it`);
for (const [n, vals] of Object.entries(enums)) {
  const used = (c.props.find((p) => p.name === n)?.bindings?.figma?.type === 'VARIANT') || cssAttrs.has(kebab(n));
  if (!used) continue;
  if (!new RegExp(`data-${kebab(n)}\\b`).test(tsx)) { warn(`the tsx does not expose data-${kebab(n)} (prop "${n}")`); continue; }
  for (const v of vals) if (!css.includes(`[data-${kebab(n)}="${v}"]`)) warn(`the CSS has no selector for ${n}="${v}"`);
}
for (const b of bools) if (cssAttrs.has(kebab(b)) && !new RegExp(`data-${kebab(b)}\\s*=`).test(tsx)) err(`data-${kebab(b)} must be set in the tsx (data-${kebab(b)}={${b} || undefined})`);

// 6. CSS: only contract variables, no loose values
const bound = boundTokens(c);
const allowedVars = new Set();
for (const t of bound) { allowedVars.add(toVarName(t)); allowedVars.add(toVarName(t) + '-letter-spacing'); }
const tokenNames = root ? loadTokenNames(root) : null;
const allowedPrefix = (c.tokens?.policy?.allowed ?? []).map((a) => a.split('.').join('-'));
const clean = css.replace(/\/\*[\s\S]*?\*\//g, '');
const used = new Set([...clean.matchAll(/var\((--[\w-]+)/g)].map((m) => m[1]));
for (const v of used) {
  if (v.startsWith('--_')) continue; // component-local variables
  if (allowedVars.has(v)) continue;
  const isToken = tokenNames ? [...tokenNames].some((t) => toVarName(t) === v) : true;
  if (!isToken) err(`nonexistent variable ${v}`);
  else err(`${v} is not in the contract's tokens.bindings (invented token?)`);
}
if (/#[0-9a-fA-F]{3,8}\b/.test(clean)) err('loose hex color in the CSS');
if (/\b(?:rgba?|hsla?|oklch|color-mix)\(/.test(clean)) err('loose rgb/hsl color in the CSS');
const { px, opacity } = numericValues(c);
for (const m of clean.matchAll(/(?<![\w.-])(\d*\.?\d+)px\b/g)) { const n = Number(m[1]); if (!px.has(n)) err(`loose value ${m[0]}: not in the contract (layout / tokens.bindings)`); }
for (const m of clean.matchAll(/([^{}]*)\{([^{}]*)\}/g)) {
  const sel = m[1].trim(), bodyCss = m[2];
  for (const o of bodyCss.matchAll(/\bopacity\s*:\s*([\d.]+)/g)) {
    const selNoNot = sel.replace(/:not\([^)]*\)/g, ''); // :hover:not(:disabled) is not a disabled rule
    if (/:disabled|\[aria-disabled|\[data-disabled/.test(selNoNot)) err(`opacity in a disabled selector (${sel.slice(0, 60)}…): disabled uses tokens`);
    else if (!opacity.has(Number(o[1]))) err(`opacity ${o[1]} is not in the contract`);
  }
}
if (!(/\.root\b/.test(clean)) && !/\.[\w-]+/.test(clean)) warn('the CSS has no classes');
const unused = [...bound].filter((t) => !used.has(toVarName(t)) && !used.has(toVarName(t).replace(/-letter-spacing$/, '')));
if (unused.length) warn(`${unused.length} contract tokens do not appear in the CSS${unused.length <= 8 ? ': ' + unused.join(', ') : ` (e.g. ${unused.slice(0, 5).join(', ')})`}`);

// 7. Known items still to be decided
const nr = c.meta?.needsReview ?? [];
if (nr.length) warn(`the contract has ${nr.length} items in meta.needsReview: confirm none affects what you did`);
if (!/TODO\(contract\)/.test(tsx + css) && nr.length) { /* ok */ }

for (const w of warnings) console.log('warning ', w);
for (const e of errors) console.log('ERROR  ', e);
console.log(`\n${Name}@${c.version} · ${errors.length} errors, ${warnings.length} warnings`);
process.exit(errors.length ? 1 : 0);
