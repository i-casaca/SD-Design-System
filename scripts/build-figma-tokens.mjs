#!/usr/bin/env node
// tokens/tokens.json → código para Figma (Plugin API) que crea o actualiza variables y estilos.
//   node scripts/build-figma-tokens.mjs [--batch 400]
// Salida: .cache/figma/tokens-NN.js (variables, por lotes) y tokens-styles.js (36 texto + 12 efecto).
// Cada archivo es el `code` de una llamada a figma_execute / use_figma. Seguro de repetir (upsert por nombre).
// Colecciones (docs/tokens-from-figma.md, ticket #12): Radius, Scaling, Color scheme (Light/Dark), Theme ✦ (Theme A).
// Nombre en Figma = ruta del JSON con «/» (colors.accent.accent.9 → colors/accent/accent/9). Code syntax WEB = var(--…) de tokens.css.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const batch = Number(args[args.indexOf('--batch') + 1] || 400) || 400;
const tokens = JSON.parse(fs.readFileSync(path.join(root, 'tokens', 'tokens.json'), 'utf8'));
const out = path.join(root, '.cache', 'figma');
fs.mkdirSync(out, { recursive: true });
for (const f of fs.readdirSync(out)) if (f.startsWith('tokens-')) fs.unlinkSync(path.join(out, f));

const flat = [];
const walk = (o, p = []) => {
  for (const [k, v] of Object.entries(o)) {
    if (k.startsWith('$') || !v || typeof v !== 'object') continue;
    if ('$value' in v) flat.push({ path: [...p, k].join('.'), t: v });
    else walk(v, [...p, k]);
  }
};
walk(tokens);

const known = new Set(flat.map((x) => x.path));
const ref = (v) => {
  if (typeof v !== 'string' || !v.startsWith('{')) return v;
  const r = v.slice(1, -1);
  if (!known.has(r)) throw new Error(`Referencia rota ${v}`);
  return v;
};
// Variables: todo salvo shadows y text-style (que son estilos).
const TYPE = { color: 'c', dimension: 'f', fontFamily: 's', fontWeight: 's', number: 'f' };
const num = (v) => (typeof v === 'string' && !v.startsWith('{') ? parseFloat(v) : v);
const vars = flat
  .filter((x) => !['shadows', 'text-style'].includes(x.path.split('.')[0]))
  .map(({ path: p, t }) => {
    const ty = TYPE[t.$type];
    if (!ty) throw new Error(`Tipo sin mapear ${t.$type} en ${p}`);
    // fontWeight se guarda como STRING con el nombre de estilo de Figma («Medium»), para enlazar fontStyle.
    const val = (v) => (t.$type === 'fontWeight' ? t.$extensions?.['com.figma']?.value ?? String(v) : ty === 'f' ? num(ref(v)) : ref(v));
    const m = t.$extensions?.modes;
    const row = [p, ty, val(m ? m.light : t.$value)];
    if (m && m.dark !== m.light) row[3] = val(m.dark);
    const sc = t.$extensions?.['com.figma']?.scopes;
    if (sc && sc.length) row[4] = sc;
    return row;
  });

const prelude = `
const COLS = {'Radius':['Value'],'Scaling':['Value'],'Color scheme':['Light','Dark'],'Theme ✦':['Theme A']};
const colOf = (p) => { const [a,b] = p.split('.'); if (a==='radius-scale') return 'Radius'; if (a==='scaling') return 'Scaling';
  if (a==='overlays'||a==='variables') return 'Color scheme'; if (a==='colors') return ['accent','neutral','semantic'].includes(b)?'Theme ✦':'Color scheme'; return 'Theme ✦'; };
const FT = {c:'COLOR', f:'FLOAT', s:'STRING'};
const cols = {}; for (const c of await figma.variables.getLocalVariableCollectionsAsync()) cols[c.name]=c;
for (const [n, modes] of Object.entries(COLS)) { let c = cols[n]; if (!c) { c = figma.variables.createVariableCollection(n); c.renameMode(c.modes[0].modeId, modes[0]); for (const m of modes.slice(1)) c.addMode(m); cols[n]=c; } }
const byName = {}; for (const v of await figma.variables.getLocalVariablesAsync()) byName[v.name]=v;
const fname = (p) => p.replace(/\\./g,'/');
const hex = (h) => { h=h.replace('#',''); const n=(i)=>parseInt(h.slice(i,i+2),16)/255; return {r:n(0),g:n(2),b:n(4),a:h.length>6?n(6):1}; };
`;

const varsCode = (rows) => `// tokens.json → variables (${rows.length}). Generado por scripts/build-figma-tokens.mjs. No editar.
${prelude}
const ROWS = ${JSON.stringify(rows)};
// Un alias apunta siempre a una variable del mismo tipo: si aún no existe, se crea con el tipo de quien la cita.
const get = (p, ty) => { const n=fname(p); let v=byName[n]; if (!v) { v=figma.variables.createVariable(n, cols[colOf(p)], FT[ty]); v.setVariableCodeSyntax('WEB','var(--'+p.replace(/\\./g,'-')+')'); byName[n]=v; } return v; };
const val = (ty, x) => typeof x==='string' && x.startsWith('{') ? figma.variables.createVariableAlias(get(x.slice(1,-1), ty)) : ty==='c' ? hex(x) : x;
let n=0;
for (const [p, ty, light, dark, sc] of ROWS) {
  const v = get(p, ty), c = cols[colOf(p)];
  c.modes.forEach((m, i) => v.setValueForMode(m.modeId, val(ty, i===1 && dark!=null ? dark : light)));
  if (sc) v.scopes = sc;
  n++;
}
return { done: n, total: Object.keys(byName).length };
`;

for (let i = 0; i < vars.length; i += batch) {
  fs.writeFileSync(path.join(out, `tokens-${String(i / batch + 1).padStart(2, '0')}.js`), varsCode(vars.slice(i, i + batch)));
}

// Estilos: texto (enlazado a typography.*) y efecto (capas en orden inverso a CSS, color enlazado).
const text = flat.filter((x) => x.path.startsWith('text-style.')).map(({ path: p, t }) => [p, t.$value]);
const shadows = flat.filter((x) => x.path.startsWith('shadows.')).map(({ path: p, t }) => [p, [...t.$value].reverse()]);
const weightName = Object.fromEntries(
  Object.entries(tokens.typography['font-weight']).map(([k, v]) => [`{typography.font-weight.${k}}`, v.$extensions['com.figma'].value]),
);
const familyName = Object.fromEntries(Object.entries(tokens.typography['font-family']).map(([k, v]) => [`{typography.font-family.${k}}`, v.$value]));
const stylesCode = `// tokens.json → ${text.length} estilos de texto + ${shadows.length} de efecto. Generado por scripts/build-figma-tokens.mjs.
const TEXT = ${JSON.stringify(text)};
const SHADOWS = ${JSON.stringify(shadows)};
const W = ${JSON.stringify(weightName)}, F = ${JSON.stringify(familyName)};
const byName = {}; for (const v of await figma.variables.getLocalVariablesAsync()) byName[v.name]=v;
const V = (r) => { const v = byName[r.slice(1,-1).replace(/\\./g,'/')]; if (!v) throw new Error('Falta la variable '+r+': ejecuta antes los lotes tokens-NN.js'); return v; };
const fname = (p) => p.replace(/\\./g,'/');
const ts = {}; for (const s of await figma.getLocalTextStylesAsync()) ts[s.name]=s;
const es = {}; for (const s of await figma.getLocalEffectStylesAsync()) es[s.name]=s;
for (const [p, t] of TEXT) {
  const s = ts[fname(p)] || figma.createTextStyle(); s.name = fname(p);
  await figma.loadFontAsync({ family: F[t.fontFamily], style: W[t.fontWeight] });
  s.fontName = { family: F[t.fontFamily], style: W[t.fontWeight] };
  s.setBoundVariable('fontFamily', V(t.fontFamily)); s.setBoundVariable('fontStyle', V(t.fontWeight));
  s.setBoundVariable('fontSize', V(t.fontSize)); s.setBoundVariable('lineHeight', V(t.lineHeight)); s.setBoundVariable('letterSpacing', V(t.letterSpacing));
}
for (const [p, layers] of SHADOWS) {
  const s = es[fname(p)] || figma.createEffectStyle(); s.name = fname(p);
  s.effects = layers.map((l) => figma.variables.setBoundVariableForEffect({ type: l.inset ? 'INNER_SHADOW' : 'DROP_SHADOW', color: {r:0,g:0,b:0,a:1},
    offset: { x: parseFloat(l.offsetX), y: parseFloat(l.offsetY) }, radius: parseFloat(l.blur), spread: parseFloat(l.spread),
    visible: true, blendMode: 'NORMAL', ...(l.inset ? {} : { showShadowBehindNode: false }) }, 'color', V(l.color)));
}
return { text: TEXT.length, effects: SHADOWS.length };
`;
fs.writeFileSync(path.join(out, 'tokens-styles.js'), stylesCode);
console.log(`${vars.length} variables en ${Math.ceil(vars.length / batch)} lotes + estilos → .cache/figma/tokens-*.js`);
