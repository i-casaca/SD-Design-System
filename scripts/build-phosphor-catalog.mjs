#!/usr/bin/env node
// Generates icons/phosphor/catalog.json: the COMPLETE Phosphor list (name, tags, categories, aliases).
//   node scripts/build-phosphor-catalog.mjs            -> uses .cache/phosphor (downloaded the first time)
//   node scripts/build-phosphor-catalog.mjs --update   -> updates .cache/phosphor before reading
//   node scripts/build-phosphor-catalog.mjs --source path/to/core-repo   -> uses a clone of phosphor-icons/core you already have
// No dependencies. Needs git and network only the first time (or with --update).
// The metadata comes from src/icons.ts (TypeScript): it is read with regular expressions, without running any repo code.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const argVal = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const REPO = 'https://github.com/phosphor-icons/core.git';
const WEIGHTS = ['regular', 'fill']; // weights that are downloaded (the ones the system allows)
const src = path.resolve(argVal('--source') ?? path.join(root, '.cache', 'phosphor'));
const git = (...a) => execFileSync('git', a, { stdio: ['ignore', 'pipe', 'inherit'] }).toString().trim();

if (!fs.existsSync(path.join(src, 'src', 'icons.ts'))) {
    if (argVal('--source')) throw new Error(`No existe ${src}/src/icons.ts`);
    console.log('Downloading Phosphor core (metadata and regular and fill weights)…');
    fs.mkdirSync(path.dirname(src), { recursive: true });
    git('clone', '--quiet', '--depth', '1', '--filter=blob:none', '--sparse', REPO, src);
    git('-C', src, 'sparse-checkout', 'set', 'src', ...WEIGHTS.map((w) => `assets/${w}`));
} else if (args.includes('--update') && !argVal('--source')) {
    git('-C', src, 'pull', '--quiet', '--depth', '1');
}

// Enums from src/types.ts: { ARROWS: 'arrows', … }
const types = fs.readFileSync(path.join(src, 'src', 'types.ts'), 'utf8');
const readEnum = (name) => {
    const body = types.match(new RegExp(`export enum ${name} \\{([\\s\\S]*?)\\}`))?.[1];
    if (!body) throw new Error(`Cannot find enum ${name} in src/types.ts`);
    return Object.fromEntries([...body.matchAll(/(\w+)\s*=\s*"([^"]+)"/g)].map((m) => [m[1], m[2]]));
};
const iconCategory = readEnum('IconCategory');
const figmaCategory = readEnum('FigmaCategory');
const allWeights = Object.values(readEnum('IconStyle'));

// stable id for the command line: "technology & development" -> "technology-development"
const slug = (s) => s.toLowerCase().replace(/\s*&\s*/g, '-').replace(/\s+/g, '-');
const title = (s) => s[0].toUpperCase() + s.slice(1);

// Entries from src/icons.ts: each one is an object literal indented by 2 spaces.
const ts = fs.readFileSync(path.join(src, 'src', 'icons.ts'), 'utf8');
const blocks = [...ts.matchAll(/^ {2}\{\n([\s\S]*?)\n {2}\},?$/gm)].map((m) => m[1]);
const field = (b, k) => b.match(new RegExp(`^ {4}${k}: (.+?),?$`, 'm'))?.[1];
const str = (v) => JSON.parse(v);
const enumList = (b, k, map, enumName) => {
    const raw = b.match(new RegExp(`^ {4}${k}: \\[([\\s\\S]*?)\\]`, 'm'))?.[1] ?? '';
    return [...raw.matchAll(new RegExp(`${enumName}\\.(\\w+)`, 'g'))].map((m) => {
        if (!(m[1] in map)) throw new Error(`${enumName}.${m[1]} is not in src/types.ts`);
        return slug(map[m[1]]);
    });
};

const icons = blocks.map((b) => {
    const name = str(field(b, 'name'));
    const aliasName = b.match(/^ {4}alias: \{ name: "([^"]+)"/m)?.[1];
    const fc = field(b, 'figma_category')?.match(/FigmaCategory\.(\w+)/)?.[1];
    if (!fc || !(fc in figmaCategory)) throw new Error(`"${name}": unknown figma_category`);
    const tagsRaw = b.match(/^ {4}tags: \[([\s\S]*?)\]/m)?.[1] ?? '';
    const tags = [...tagsRaw.matchAll(/"([^"]*)"/g)].map((m) => m[1]).filter((t) => t !== '*new*' && t !== '*updated*');
    for (const w of WEIGHTS) {
        const file = w === 'regular' ? `${name}.svg` : `${name}-${w}.svg`;
        if (!fs.existsSync(path.join(src, 'assets', w, file))) throw new Error(`Missing ${w} SVG for "${name}"`);
    }
    return {
        name,
        pascal: str(field(b, 'pascal_name')),
        categories: enumList(b, 'categories', iconCategory, 'IconCategory'),
        figmaCategory: slug(figmaCategory[fc]),
        tags,
        ...(aliasName ? { aliases: [aliasName] } : {}),
        published: Number(field(b, 'published_in')),
        updated: Number(field(b, 'updated_in')),
    };
}).sort((a, b) => a.name.localeCompare(b.name));
if (!icons.length) throw new Error('No icon was read from src/icons.ts: did the format change?');

const categories = Object.values(iconCategory).map((v) => ({ id: slug(v), title: title(v), count: icons.filter((i) => i.categories.includes(slug(v))).length }));
const figmaCategories = Object.values(figmaCategory).map((v) => ({ id: slug(v), title: title(v) }));

let commit = 'desconocido', date = null, version = null;
try { commit = git('-C', src, 'rev-parse', '--short', 'HEAD'); date = git('-C', src, 'log', '-1', '--format=%cs'); } catch { }
try { version = JSON.parse(fs.readFileSync(path.join(src, 'package.json'), 'utf8')).version; } catch { }

const head = {
    $description: 'Complete Phosphor catalog. DO NOT edit by hand: generated with `npm run phosphor:catalog`. It is the list of EVERYTHING that exists; what can be used in code is in icons/phosphor/registry.json (a subset of this catalog).',
    library: 'phosphor', package: '@phosphor-icons/react', docs: 'https://phosphoricons.com',
    source: { repo: 'phosphor-icons/core', version, commit, date },
    canvas: { viewBox: '0 0 256 256', designGrid: 16, unit: 'px', render: 'fill (fill=currentColor), not stroke' },
    weights: allWeights,
    reactExport: '<pascal>Icon (ArrowRight -> ArrowRightIcon)',
    count: icons.length,
};
// One icon per line: the git diff reads well.
const out = '{\n' + Object.entries(head).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(',\n')
    + ',\n  "categories": [\n' + categories.map((c) => '    ' + JSON.stringify(c)).join(',\n')
    + '\n  ],\n  "figmaCategories": [\n' + figmaCategories.map((c) => '    ' + JSON.stringify(c)).join(',\n')
    + '\n  ],\n  "icons": [\n' + icons.map((i) => '    ' + JSON.stringify(i)).join(',\n') + '\n  ]\n}\n';
fs.mkdirSync(path.join(root, 'icons', 'phosphor'), { recursive: true });
fs.writeFileSync(path.join(root, 'icons', 'phosphor', 'catalog.json'), out);
console.log(`icons/phosphor/catalog.json: ${icons.length} icons, ${categories.length} categories (Phosphor ${version} @ ${commit})`);
