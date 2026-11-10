#!/usr/bin/env node
// Minimal check, no dependencies.
// Usage: node check.mjs [design-system-folder]
//   Without an argument: this file's folder if it has contracts/; otherwise the current directory.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = process.argv[2] ? path.resolve(process.argv[2]) : fs.existsSync(path.join(here, 'contracts')) ? here : process.cwd();
if (!fs.existsSync(path.join(root, 'contracts'))) { console.error(`No contracts/ folder in ${root}`); process.exit(2); }
const errors = [];
const warnings = [];
const err = (f, m) => errors.push(`${f}: ${m}`);
const warn = (f, m) => warnings.push(`${f}: ${m}`);
const readJson = (p) => {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch (e) { err(path.relative(root, p), `Invalid JSON (${e.message})`); return null; }
};

// 1. Tokens: flat list and {a.b.c} references that must exist
const listJson = (d) => fs.readdirSync(path.join(root, d), { withFileTypes: true }).flatMap((e) => e.isDirectory() ? listJson(path.join(d, e.name)) : e.name.endsWith('.json') ? [path.join(d, e.name)] : []);
const hasTokens = fs.existsSync(path.join(root, 'tokens'));
const tokenFiles = hasTokens ? listJson('tokens') : [];
if (!hasTokens) warnings.push('tokens/: does not exist; cited tokens are not checked for existence');
const names = new Set();
const walk = (o, p = []) => {
  for (const [k, v] of Object.entries(o)) {
    if (k.startsWith('$')) continue;
    if (v && typeof v === 'object') {
      if ('$value' in v) names.add([...p, k].join('.'));
      else walk(v, [...p, k]);
    }
  }
};
const loaded = tokenFiles.map((f) => [f, readJson(path.join(root, f))]).filter(([, j]) => j);
for (const [, j] of loaded) walk(j);
for (const [f, j] of loaded) {
  const refs = (o) => {
    for (const [k, v] of Object.entries(o)) {
      if (k === '$value' && typeof v === 'string' && /^\{.+\}$/.test(v) && !names.has(v.slice(1, -1)))
        err(f, `broken reference ${v}`);
      else if (v && typeof v === 'object') refs(v);
      else if (typeof v === 'string' && /^\{.+\}$/.test(v) && !names.has(v.slice(1, -1))) err(f, `broken reference ${v}`);
    }
  };
  refs(j);
}

// 2. Contracts
const dir = path.join(root, 'contracts');
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.contract.json'));
const known = new Set(files.map((f) => f.split('.')[0]));
const core = ['id', 'name', 'version', 'status', 'description', 'guidance', 'semantics', 'props', 'states', 'anatomy', 'tokens', 'a11y'];
const strings = (o, out = []) => {
  if (typeof o === 'string') out.push(o);
  else if (o && typeof o === 'object') Object.values(o).forEach((v) => strings(v, out));
  return out;
};

for (const f of files) {
  const c = readJson(path.join(dir, f));
  if (!c) continue;
  if (f.startsWith('_')) continue; // the template only has to be valid JSON
  for (const k of core) if (!(k in c)) err(f, `missing block "${k}"`);
  const { anchors, ...rest } = c;
  // marker = "<text with spaces>" or a string starting with "<"; <button>, <a> and TypeScript generics do not count
  const pending = (o) => strings(o).some((s) => /^<[^>]+>/.test(s) || /<[^>\s/]*\s[^>/]*>/.test(s));
  if (pending(rest)) err(f, 'unfilled <...> placeholders remain');
  if (pending(anchors ?? {})) warn(f, 'anchors pending: paste the Figma link and the code path');
  if (c.name && f.split('.')[0] !== c.name) err(f, `the file name must be ${c.name}.contract.json`);

  // props: unique names and unique Figma properties
  const propNames = new Set();
  const figmaProps = new Set();
  const enums = {};
  for (const p of c.props ?? []) {
    if (propNames.has(p.name)) err(f, `duplicate prop "${p.name}"`);
    propNames.add(p.name);
    const fb = p.bindings?.figma;
    const fp = fb?.property;
    const fk = fp && fb.value !== undefined ? `${fp}=${fb.value}` : fp; // several props can share an axis if each has its own value
    if (fp) { if (figmaProps.has(fk)) err(f, `duplicate Figma property "${fk}"`); figmaProps.add(fk); figmaProps.add(fp); }
    const vals = [...String(p.type).matchAll(/'([^']+)'/g)].map((m) => m[1]);
    if (vals.length) enums[p.name] = vals;
  }

  // anatomy: complete slots and existing refTarget
  for (const [part, def] of Object.entries(c.anatomy ?? {})) {
    if (def.slot && !(def.slot.allowedComponents?.length)) err(f, `the slot of "${part}" does not declare allowedComponents`);
    if (def.content && !propNames.has(def.content.prop)) err(f, `anatomy.${part}.content points to a nonexistent prop "${def.content.prop}"`);
    if (def.slot?.figmaProp && ![...figmaProps].includes(def.slot.figmaProp))
      warn(f, `slot "${part}": figmaProp "${def.slot.figmaProp}" does not match any Figma property in props`);
  }
  if (c.semantics?.refTarget && !(c.semantics.refTarget in (c.anatomy ?? {})))
    err(f, `semantics.refTarget "${c.semantics.refTarget}" is not a part of anatomy`);

  // guidance
  for (const d of c.guidance?.donts ?? []) if (!d.case || !d.useInstead) err(f, 'each don\'t needs case and useInstead');
  for (const r of c.guidance?.related ?? []) if (!known.has(r.component)) warn(f, `related: "${r.component}" has no contract yet`);

  // tokens: exist, within policy, expanding {prop}
  const { allowed = [], forbidden = [] } = c.tokens?.policy ?? {};
  const under = (s, list) => list.some((a) => s === a || s.startsWith(a + '.'));
  const scales = c.tokens?.scales ?? {};
  // expands {prop} (enum values) and {prop.key} (tokens.scales[value][key]); allows several per string
  const expand = (s) => {
    let list = [s];
    for (const m of [...s.matchAll(/\{(\w+)(?:\.(\w+))?\}/g)]) {
      const [ph, prop, key] = m;
      if (!enums[prop]) { err(f, `placeholder ${ph} has no enum in props`); return []; }
      list = list.flatMap((cur) => enums[prop].flatMap((v) => {
        if (!key) return [cur.replace(ph, v)];
        const sc = scales[v];
        if (!sc || !(key in sc)) { err(f, `tokens.scales.${v}.${key} does not exist (used in ${s})`); return []; }
        return sc[key] === null ? [] : [cur.replace(ph, sc[key])];
      }));
    }
    return list;
  };
  const checkTok = (t) => {
    if (hasTokens && !names.has(t)) err(f, `nonexistent token "${t}"`);
    if (under(t, forbidden)) err(f, `token forbidden by policy "${t}"`);
    else if (!under(t, allowed)) err(f, `token outside policy.allowed "${t}"`);
  };
  for (const s of strings(c.tokens?.bindings ?? {})) for (const t of expand(s)) checkTok(t);
}

// 3. Icons: valid registry, per library (Lucide in icons/, Phosphor in icons/phosphor/)
const checkIcons = (dir, lib) => {
  const regRel = `${dir}/registry.json`, catRel = `${dir}/catalog.json`;
  const regPath = path.join(root, regRel);
  if (!fs.existsSync(regPath)) return;
  const reg = readJson(regPath);
  const ns = (reg?.icons ?? []).map((i) => i.name);
  for (const n of ns) if (!/^[A-Z][A-Za-z0-9]*$/.test(n)) err(regRel, `invalid name "${n}" (PascalCase, as in ${reg.library})`);
  if (new Set(ns).size !== ns.length) err(regRel, 'duplicate names');
  for (const i of reg?.icons ?? []) if (!i.use) err(regRel, `"${i.name}" has no use field`);

  // 4. Full catalog (optional): consistent, and the registry is a subset of it
  const catPath = path.join(root, catRel);
  if (fs.existsSync(catPath)) {
    const cat = readJson(catPath);
    const ci = cat?.icons ?? [];
    const kebab = ci.map((i) => i.name);
    if (new Set(kebab).size !== kebab.length) err(catRel, 'duplicate names');
    if (cat.count !== ci.length) err(catRel, `count (${cat.count}) does not match the icons (${ci.length})`);
    const cats = new Set((cat.categories ?? []).map((c) => c.id));
    for (const i of ci) for (const c of i.categories ?? []) if (!cats.has(c)) err(catRel, `"${i.name}": undefined category "${c}"`);
    for (const w of reg?.weights ?? []) if (!(cat.weights ?? []).includes(w)) err(regRel, `weight "${w}" does not exist in ${catRel}`);
    const pas = (n) => n.split('-').map((p) => p[0].toUpperCase() + p.slice(1)).join('');
    const canon = new Set(ci.map((i) => i.pascal));
    const alias = new Map(ci.flatMap((i) => (i.aliases ?? []).map((a) => [pas(a), i.pascal])));
    for (const n of ns) {
      if (canon.has(n)) continue;
      if (alias.has(n)) warnings.push(`${regRel}: "${n}" is an old alias in ${lib}; the current name is "${alias.get(n)}"`);
      else err(regRel, `"${n}" does not exist in ${catRel}`);
    }
  }
};
checkIcons('icons', 'Lucide');
checkIcons('icons/phosphor', 'Phosphor');

for (const w of warnings) console.log('warning ', w);
for (const e of errors) console.log('ERROR  ', e);
console.log(`\n${files.length} contracts, ${names.size} tokens · ${errors.length} errors, ${warnings.length} warnings`);
process.exit(errors.length ? 1 : 0);
