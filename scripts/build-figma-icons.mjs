#!/usr/bin/env node
// Prepares code batches to create the Lucide icons as components in Figma (via MCP, use_figma tool).
//   node scripts/build-figma-icons.mjs [selection] [--batch 40] [--stroke-variable colors.neutral.neutral.12]
// Selection (only one):
//   (nada) / --registry      the icons in icons/registry.json
//   --all                    all 1,903 icons in the catalog
//   --category arrows        one catalog category
//   --names arrow-right,plus  nombres concretos (kebab-case)
// Output: .cache/figma/batch-001.js, batch-002.js… (each one is the `code` of a use_figma call).
// The SVGs are read from .cache/lucide (created by `npm run icons:catalog`). No dependencies.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const val = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const batchSize = Number(val('--batch') ?? 40);
const strokeVar = val('--stroke-variable') ?? 'colors.neutral.neutral.12';

const cat = JSON.parse(fs.readFileSync(path.join(root, 'icons', 'catalog.json'), 'utf8'));
const svgDir = path.join(root, '.cache', 'lucide', 'icons');
if (!fs.existsSync(svgDir)) throw new Error('Missing .cache/lucide: run first `npm run icons:catalog`.');

let list;
if (args.includes('--all')) list = cat.icons;
else if (val('--category')) {
    const c = val('--category');
    if (!cat.categories.some((x) => x.id === c)) throw new Error(`Unknown category "${c}". Available: ${cat.categories.map((x) => x.id).join(', ')}`);
    list = cat.icons.filter((i) => i.categories.includes(c));
} else if (val('--names')) {
    const ns = val('--names').split(',').map((s) => s.trim());
    const bad = ns.filter((n) => !cat.icons.some((i) => i.name === n));
    if (bad.length) throw new Error(`Not in the catalog: ${bad.join(', ')}`);
    list = ns.map((n) => cat.icons.find((i) => i.name === n));
} else {
    const reg = JSON.parse(fs.readFileSync(path.join(root, 'icons', 'registry.json'), 'utf8'));
    const byPascal = new Map(cat.icons.flatMap((i) => [[i.pascal, i], ...(i.aliases ?? []).map((a) => [a.split('-').map((p) => p[0].toUpperCase() + p.slice(1)).join(''), i])]));
    const miss = reg.icons.filter((i) => !byPascal.has(i.name)).map((i) => i.name);
    if (miss.length) throw new Error(`In the registry but not in the catalog: ${miss.join(', ')}`);
    list = [...new Map(reg.icons.map((i) => [byPascal.get(i.name).name, byPascal.get(i.name)])).values()];
}

// Minimal data per icon: name, main category, description (for Figma search) and the SVG strokes.
const catTitle = Object.fromEntries(cat.categories.map((c) => [c.id, c.title]));
const inner = (svg) => svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').replace(/\s+/g, ' ').trim();
const items = list.map((i) => {
    const body = inner(fs.readFileSync(path.join(svgDir, `${i.name}.svg`), 'utf8'));
    return {
        n: i.name,
        g: catTitle[i.categories[0]] ?? 'Uncategorized',
        d: `lucide:${i.name}\ncategories: ${i.categories.join(', ')}\ntags: ${i.tags.join(', ')}`,
        s: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`,
    };
});

const tpl = (batch) => `// Lucide → Figma. Batch of ${batch.length} icons. Safe to repeat: skips the ones that already exist.
const STROKE_VARIABLE = ${JSON.stringify(strokeVar)}; // stroke color variable (if it does not exist, it stays black and a warning is shown)
const PAGE = 'Iconos Lucide', FRAME = 'Lucide';
const ICONS = ${JSON.stringify(batch)};

let page = figma.root.children.find((p) => p.name === PAGE);
if (!page) { page = figma.createPage(); page.name = PAGE; }
await figma.setCurrentPageAsync(page);

let grid = page.children.find((n) => n.type === 'FRAME' && n.name === FRAME);
if (!grid) {
  grid = figma.createAutoLayout('HORIZONTAL', { name: FRAME, itemSpacing: 16, paddingTop: 24, paddingRight: 24, paddingBottom: 24, paddingLeft: 24 });
  grid.layoutWrap = 'WRAP'; grid.counterAxisSpacing = 16;
  grid.resize(1600, 100); grid.layoutSizingHorizontal = 'FIXED'; grid.layoutSizingVertical = 'HUG';
  grid.fills = []; page.appendChild(grid); grid.x = 100; grid.y = 100;
}

const norm = (s) => s.replace(/[\\/]/g, '.');
let variable = null;
for (const v of await figma.variables.getLocalVariablesAsync('COLOR')) if (norm(v.name) === STROKE_VARIABLE) { variable = v; break; }

const existing = new Set(grid.children.map((c) => c.description.split('\\n')[0]));
const created = [], skipped = [];
for (const it of ICONS) {
  if (existing.has('lucide:' + it.n)) { skipped.push(it.n); continue; }
  const tmp = figma.createNodeFromSvg(it.s);
  const comp = figma.createComponent();
  comp.name = it.g + ' / ' + it.n;
  comp.description = it.d;
  comp.resize(24, 24); comp.fills = []; comp.clipsContent = false;
  for (const ch of [...tmp.children]) comp.appendChild(ch);
  tmp.remove();
  if (variable) {
    for (const n of comp.findAll((x) => 'strokes' in x && x.strokes.length > 0)) {
      n.strokes = n.strokes.map((p) => figma.variables.setBoundVariableForPaint(p, 'color', variable));
    }
  }
  grid.appendChild(comp);
  comp.layoutSizingHorizontal = 'FIXED'; comp.layoutSizingVertical = 'FIXED';
  created.push(comp.id);
}
return { page: page.id, grid: grid.id, created: created.length, skipped: skipped.length, strokeVariable: variable ? variable.name : 'NO ENCONTRADA (trazo negro)', createdNodeIds: created };
`;

const outDir = path.join(root, '.cache', 'figma');
fs.rmSync(outDir, { recursive: true, force: true }); fs.mkdirSync(outDir, { recursive: true });
let n = 0;
for (let i = 0; i < items.length; i += batchSize) {
    const f = path.join(outDir, `batch-${String(++n).padStart(3, '0')}.js`);
    fs.writeFileSync(f, tpl(items.slice(i, i + batchSize)));
}
const kb = Math.round(fs.statSync(path.join(outDir, 'batch-001.js')).size / 1024);
console.log(`${items.length} icons → ${n} batch(es) in .cache/figma/ (the first weighs ${kb} KB). Stroke variable: ${strokeVar}`);
