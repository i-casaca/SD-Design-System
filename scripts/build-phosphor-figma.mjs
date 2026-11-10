#!/usr/bin/env node
// Prepares code batches to create the Phosphor icons as components in Figma (via MCP, use_figma tool).
// Each icon is a component set with a "Weight" property (Regular / Fill), the two weights the system allows.
//   node scripts/build-phosphor-figma.mjs [selection] [--batch 30] [--fill-variable colors.neutral.neutral.12]
// Selection (only one):
//   (nada) / --registry      the icons in icons/phosphor/registry.json
//   --all                    all 1,512 icons in the catalog
//   --category arrows        one catalog category
//   --names arrow-right,plus  nombres concretos (kebab-case)
// Output: .cache/figma-phosphor/batch-001.js, batch-002.js… (each one is the `code` of a use_figma call)
// and entry.js, which runs last: creates or updates "Phosphor Icon", the entry component with the
// properties Icon (instance swap among all icons) and Weight (of the inner icon, exposed).
// The SVGs are read from .cache/phosphor (created by `npm run phosphor:catalog`). No dependencies.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const val = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const batchSize = Number(val('--batch') ?? 30);
const fillVar = val('--fill-variable') ?? 'colors.neutral.neutral.12';

const cat = JSON.parse(fs.readFileSync(path.join(root, 'icons', 'phosphor', 'catalog.json'), 'utf8'));
const assets = path.join(root, '.cache', 'phosphor', 'assets');
if (!fs.existsSync(assets)) throw new Error('Missing .cache/phosphor: run first `npm run phosphor:catalog`.');

// Registry icons (kebab-case): preferred swap values in "Phosphor Icon"; the first one is the default value.
const reg = JSON.parse(fs.readFileSync(path.join(root, 'icons', 'phosphor', 'registry.json'), 'utf8'));
const pas = (n) => n.split('-').map((p) => p[0].toUpperCase() + p.slice(1)).join('');
const byPascal = new Map(cat.icons.flatMap((i) => [[i.pascal, i], ...(i.aliases ?? []).map((a) => [pas(a), i])]));
const miss = reg.icons.filter((i) => !byPascal.has(i.name)).map((i) => i.name);
if (miss.length) throw new Error(`In the registry but not in the catalog: ${miss.join(', ')}`);
const registryIcons = [...new Map(reg.icons.map((i) => [byPascal.get(i.name).name, byPascal.get(i.name)])).values()];

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
} else list = registryIcons;

// Minimal data per icon: name, Figma group, description (for Figma search) and the SVG of each weight at 24 × 24.
const groupTitle = Object.fromEntries(cat.figmaCategories.map((c) => [c.id, c.title]));
const svg = (w, n) => fs.readFileSync(path.join(assets, w, w === 'regular' ? `${n}.svg` : `${n}-${w}.svg`), 'utf8')
    .trim().replace('<svg ', '<svg width="24" height="24" ').replace(/fill="currentColor"/g, 'fill="#000"');
const items = list.map((i) => ({
    n: i.name,
    g: groupTitle[i.figmaCategory] ?? 'Uncategorized',
    d: `phosphor:${i.name}\ncategories: ${i.categories.join(', ')}\ntags: ${i.tags.join(', ')}`,
    r: svg('regular', i.name),
    f: svg('fill', i.name),
}));

const tpl = (batch) => `// Phosphor → Figma. Batch of ${batch.length} icons (Weight: Regular / Fill). Safe to repeat: skips the ones that already exist.
const FILL_VARIABLE = ${JSON.stringify(fillVar)}; // fill color variable (if it does not exist, it stays black and a warning is shown)
const PAGE = 'Iconos Phosphor', FRAME = 'Phosphor';
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
for (const v of await figma.variables.getLocalVariablesAsync('COLOR')) if (norm(v.name) === FILL_VARIABLE) { variable = v; break; }

const variant = (svg, weight) => {
  const tmp = figma.createNodeFromSvg(svg);
  const comp = figma.createComponent();
  comp.name = 'Weight=' + weight;
  comp.resize(24, 24); comp.fills = []; comp.clipsContent = false;
  for (const ch of [...tmp.children]) comp.appendChild(ch);
  tmp.remove();
  if (variable) {
    for (const n of comp.findAll((x) => 'fills' in x && Array.isArray(x.fills) && x.fills.length > 0)) {
      n.fills = n.fills.map((p) => p.type === 'SOLID' ? figma.variables.setBoundVariableForPaint(p, 'color', variable) : p);
    }
  }
  page.appendChild(comp);
  return comp;
};

const existing = new Set(grid.children.map((c) => (c.description ?? '').split('\\n')[0]));
const created = [], skipped = [];
for (const it of ICONS) {
  if (existing.has('phosphor:' + it.n)) { skipped.push(it.n); continue; }
  const set = figma.combineAsVariants([variant(it.r, 'Regular'), variant(it.f, 'Fill')], grid);
  set.name = it.g + ' / ' + it.n;
  set.description = it.d;
  set.layoutMode = 'HORIZONTAL'; set.itemSpacing = 8;
  set.primaryAxisSizingMode = 'AUTO'; set.counterAxisSizingMode = 'AUTO'; set.fills = [];
  created.push(set.id);
}
return { page: page.id, grid: grid.id, created: created.length, skipped: skipped.length, fillVariable: variable ? variable.name : 'NO ENCONTRADA (relleno negro)', createdNodeIds: created };
`;

const entryTpl = (preferred) => `// Phosphor → Figma. Entry component "Phosphor Icon". Run AFTER the batches. Safe to repeat.
// Properties: Icon (instance swap; preferred = registry) and Weight (variant of the inner icon, exposed).
const PAGE = 'Iconos Phosphor', FRAME = 'Phosphor', ENTRY = 'Phosphor Icon';
const PREFERRED = ${JSON.stringify(preferred)}; // the first one is the default value

const page = figma.root.children.find((p) => p.name === PAGE);
if (!page) throw new Error('Page "' + PAGE + '" does not exist: run the batch-NNN.js batches first.');
await figma.setCurrentPageAsync(page);
const grid = page.children.find((n) => n.type === 'FRAME' && n.name === FRAME);
if (!grid) throw new Error('Frame "' + FRAME + '" does not exist: run the batch-NNN.js batches first.');

const sets = new Map(grid.children.filter((n) => n.type === 'COMPONENT_SET')
  .map((n) => [(n.description ?? '').split('\\n')[0].replace('phosphor:', ''), n]));
const available = PREFERRED.filter((n) => sets.has(n));
if (!available.length) throw new Error('No registry icon has been created: run the batches first.');
const regular = (set) => set.children.find((c) => c.name === 'Weight=Regular') ?? set.defaultVariant;

let entry = page.children.find((n) => n.type === 'COMPONENT' && n.name === ENTRY);
if (!entry) {
  entry = figma.createComponent();
  entry.name = ENTRY;
  entry.resize(24, 24); entry.fills = []; entry.clipsContent = false;
  page.appendChild(entry); entry.x = grid.x; entry.y = grid.y - 64;
}
entry.description = 'phosphor:entry\\nInsert this component. Icon: choose the icon (search over the whole catalog). Weight: Regular / Fill (fill only for the active state).\\nContract: contracts/PhosphorIconLibrary.contract.json';

let inst = entry.children.find((n) => n.type === 'INSTANCE');
if (!inst) {
  inst = regular(sets.get(available[0])).createInstance();
  entry.appendChild(inst); inst.x = 0; inst.y = 0;
}
inst.name = 'icon';
inst.constraints = { horizontal: 'SCALE', vertical: 'SCALE' };

const preferredValues = available.map((n) => ({ type: 'COMPONENT_SET', key: sets.get(n).key }));
let key = Object.keys(entry.componentPropertyDefinitions).find((k) => k.split('#')[0] === 'Icon');
if (!key) key = entry.addComponentProperty('Icon', 'INSTANCE_SWAP', regular(sets.get(available[0])).id, { preferredValues });
else entry.editComponentProperty(key, { preferredValues });
inst.componentPropertyReferences = { mainComponent: key };
inst.isExposedInstance = true; // Weight of the inner icon appears in the "Phosphor Icon" panel

return { entry: entry.id, iconProperty: key, default: available[0], preferred: available.length, missingFromFile: PREFERRED.filter((n) => !sets.has(n)) };
`;

const outDir = path.join(root, '.cache', 'figma-phosphor');
fs.rmSync(outDir, { recursive: true, force: true }); fs.mkdirSync(outDir, { recursive: true });
let n = 0;
for (let i = 0; i < items.length; i += batchSize) {
    const f = path.join(outDir, `batch-${String(++n).padStart(3, '0')}.js`);
    fs.writeFileSync(f, tpl(items.slice(i, i + batchSize)));
}
fs.writeFileSync(path.join(outDir, 'entry.js'), entryTpl(registryIcons.map((i) => i.name)));
const kb = Math.round(fs.statSync(path.join(outDir, 'batch-001.js')).size / 1024);
console.log(`${items.length} icons → ${n} batch(es) in .cache/figma-phosphor/ (the first weighs ${kb} KB) + entry.js ("Phosphor Icon"). Fill variable: ${fillVar}`);
