#!/usr/bin/env node
// Spec of a component in Markdown, generated from its contract (and, if given, the data read from Figma).
// Usage:
//   node build-spec.mjs <root> <Component> [--figma figma.json] [--repo-url https://github.com/o/r]
//        -> Markdown to stdout
//   node build-spec.mjs <root> <Component> --verify spec.md       -> the re-read Spec has the version and sections
//   node build-spec.mjs <root> <Component> --compare figma.json   -> Figma vs contract warnings (changes nothing)
// <root> = folder with contracts/<Component>.contract.json. No dependencies.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
const flag = (n) => { const i = args.indexOf(n); return i < 0 ? null : args.splice(i, 2)[1]; };
const figmaFile = flag('--figma'), verifyFile = flag('--verify'), compareFile = flag('--compare'), repoUrlArg = flag('--repo-url');
const [rootArg, name] = args;
if (!rootArg || !name) { console.error('Usage: build-spec.mjs <root> <Component> [--figma f.json | --verify spec.md | --compare f.json]'); process.exit(2); }
const root = path.resolve(rootArg);
const contractRel = `contracts/${name}.contract.json`;
const contractPath = path.join(root, contractRel);
if (!fs.existsSync(contractPath)) { console.error(`Not found: ${contractPath}`); process.exit(2); }
const c = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
const figma = figmaFile ? JSON.parse(fs.readFileSync(figmaFile, 'utf8')) : null;

const git = (...a) => { try { return execFileSync('git', ['-C', root, ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return ''; } };
const esc = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
const cell = (v) => (v === undefined || v === null || v === '' ? '—' : esc(v));
const table = (head, rows) => rows.length ? `| ${head.join(' | ')} |\n| ${head.map(() => '---').join(' | ')} |\n${rows.map((r) => `| ${r.map(cell).join(' | ')} |`).join('\n')}` : '';
const cssVar = (t) => (typeof t === 'string' && /^[a-z]/.test(t) && !t.includes('{') ? `var(--${t.replace(/\./g, '-')})` : '');
const section = (lvl, title, body) => (body && body.trim() ? `${'#'.repeat(lvl)} ${title}\n\n${body.trim()}\n` : '');
const bullets = (a) => (a || []).map((x) => `- ${x}`).join('\n');
const SECTIONS = ['Overview', 'Anatomy', 'Accessibility', 'History']; // the ones --verify requires

// ---------- Source / permalink ----------
function sourceLink() {
  let remote = repoUrlArg || git('remote', 'get-url', 'origin');
  const sha = git('rev-parse', 'HEAD');
  const m = remote.match(/github\.com[:/]([^/]+\/[^/.]+)/);
  if (!m || !sha) return null;
  return `https://github.com/${m[1]}/blob/${sha}/${contractRel}`;
}

// ---------- Flatten the contract's tokens ----------
function flattenTokens(o, p = []) {
  const rows = [];
  for (const [k, v] of Object.entries(o || {})) {
    if (v && typeof v === 'object' && !Array.isArray(v)) rows.push(...flattenTokens(v, [...p, k]));
    else rows.push([[...p, k].join('.'), v]);
  }
  return rows;
}

// ---------- Overview ----------
function overview() {
  const g = c.guidance || {};
  const usage = [
    g.dos?.length ? `**Do**\n\n${bullets(g.dos)}` : '',
    g.donts?.length ? `**Don't use it for**\n\n${table(['Case', 'Use instead', 'Why'], g.donts.map((d) => [d.case, d.useInstead, d.why]))}` : '',
    g.related?.length ? `**Related**\n\n${table(['Component', 'Relation', 'Difference'], g.related.map((r) => [r.component, r.relation, r.difference]))}` : '',
    c.content?.label ? `**Label**\n\n${table(['Field', 'Value'], Object.entries(c.content.label).map(([k, v]) => [k, v]))}` : '',
  ].filter(Boolean).join('\n\n');
  const b = c.behavior || {};
  const states = [
    c.states?.native?.length ? `Native states (CSS): ${c.states.native.map((s) => `\`${s}\``).join(', ')}` : '',
    c.states?.controlled?.length ? table(['Controlled state', 'Description', 'Attribute'], c.states.controlled.map((s) => [s.name, s.description, s.aria])) : '',
    c.events?.length ? `**Events**\n\n${table(['Event', 'Fires', 'Payload', 'Blocked when'], c.events.map((e) => [e.name, e.trigger, e.payload, (e.blockedWhen || []).join(', ')]))}` : '',
    b.loading ? `**Loading**: ${Object.entries(b.loading).map(([k, v]) => `${k}: ${v}`).join(' · ')}` : '',
    b.overflow ? `**Overflow**: ${b.overflow}` : '',
  ].filter(Boolean).join('\n\n');
  return `## Overview\n\n${[section(3, 'Definition', c.description), section(3, 'Usage Guidelines', usage), section(3, 'Behavior and Interactions', states)].join('\n')}`;
}

// ---------- Anatomy ----------
function breakdown() {
  const rows = Object.entries(c.anatomy || {}).map(([k, p], i) => [i + 1, `\`${k}\``, p.element, p.optional ? 'yes' : 'no', p.figmaLayer, p.description]);
  const img = '<!-- image:anatomy -->';
  const layers = figma?.layers?.length ? `\n\n**Values read from Figma** (variant \`${figma.variant}\`)\n\n` + table(['Layer', 'Fill', 'Stroke', 'Radius', 'Text'], figma.layers.map((l) => [
    l.path.split('/').slice(1).join('/') || l.path,
    tokenList(l.fills), tokenList(l.strokes), l.radius ? tokenOf(l.radius) : null, l.text?.style])) : '';
  return section(3, 'Component Breakdown', `${img}\n\n${table(['#', 'Part', 'Element', 'Optional', 'Figma layer', 'Description'], rows)}${layers}`);
}
const tokenOf = (t) => (t?.token ? `\`${t.token}\`${t.via?.length ? ' → ' + t.via.map((v) => `\`${v}\``).join(' → ') : ''}${t.value !== undefined && t.value !== null && typeof t.value !== 'object' ? ` (${t.value})` : ''}` : t?.value !== undefined && t?.value !== null ? `${t.value} · no token` : null);
const tokenList = (a) => (a && a.length ? a.map(tokenOf).join('<br>') : null);

function specs() {
  const L = c.layout || {};
  const rows = [];
  if (L.height) rows.push(['height', L.height.mode, L.height.values ? JSON.stringify(L.height.values) : null, L.height.token]);
  if (L.width) rows.push(['width', L.width.default, L.width.note, null]);
  if (L.autoLayout) rows.push(['auto layout', L.autoLayout.direction, `${L.autoLayout.sizingHorizontal || ''}/${L.autoLayout.sizingVertical || ''}`, L.autoLayout.gap]);
  const measured = figma?.layers?.filter((l) => l.pad || l.gap).map((l) => [l.path.split('/').slice(1).join('/') || l.path, `${l.w}×${l.h}`, l.pad ? l.pad.map(tokenOf).join(' · ') : null, tokenOf(l.gap)]);
  const body = [
    '<!-- image:specs -->',
    rows.length ? table(['Measurement', 'Mode', 'Values', 'Token'], rows) : '',
    measured?.length ? `**Measured in Figma**\n\n${table(['Layer', 'Size', 'Padding (t · r · b · l)', 'Gap'], measured)}` : '',
  ].filter(Boolean).join('\n\n');
  return section(3, 'Specs', body);
}

function properties() {
  const rows = (c.props || []).map((p) => [`\`${p.name}\``, `\`${p.type}\``, p.default === null || p.default === undefined ? (p.required ? 'required' : '—') : `\`${p.default}\``, p.bindings?.figma ? `${p.bindings.figma.property} (${p.bindings.figma.type})` : 'code only', p.description]);
  const slim = { props: (c.props || []).map((p) => ({ name: p.name, type: p.type, default: p.default ?? null, required: !!p.required })), tokens: { bindings: c.tokens?.bindings } };
  let json = JSON.stringify(slim, null, 2);
  if (Buffer.byteLength(json) > 6000) json = JSON.stringify({ props: slim.props }, null, 2); // ponytail: without tokens if it does not fit; the full contract is in the source link
  const req = (c.props || []).filter((p) => p.required).map((p) => ` ${p.name}="…"`).join('');
  const imp = c.anchors?.code;
  const tsx = `${imp?.importPath ? `import { ${imp.export || c.name} } from '${imp.importPath}';\n\n` : ''}<${c.name}${req} />`;
  const link = sourceLink();
  const code = `#### Code\n\n\`\`\`json\n${json}\n\`\`\`\n\n\`\`\`tsx\n${tsx}\n\`\`\`\n\n${link ? `Full contract: ${link}` : '<!-- no GitHub remote: add the contract permalink by hand -->'}`;
  return section(3, 'Properties', `${table(['Prop', 'Type', 'Default', 'Figma', 'Description'], rows)}\n\n${code}`);
}

function tokens() {
  const rows = flattenTokens(c.tokens?.bindings).map(([k, v]) => [k, typeof v === 'string' ? `\`${v}\`` : v, cssVar(v) ? `\`${cssVar(v)}\`` : null]);
  if (!rows.length) return '';
  const shown = rows.length > 80 ? rows.slice(0, 80) : rows;
  const more = rows.length > 80 ? `\n\n_Showing 80 of ${rows.length} rows; the rest is in the contract._` : '';
  return section(3, 'Tokens', `${table(['Where', 'Token', 'CSS variable'], shown)}${more}`);
}
const breakpoints = () => section(3, 'Breakpoints', (c.behavior?.responsive || []).length ? table(['Rule'], c.behavior.responsive.map((r) => [typeof r === 'string' ? r : JSON.stringify(r)])) : '');
const motion = () => section(3, 'Motion', (c.behavior?.motion || []).length ? table(['When', 'Property', 'Reduced motion'], c.behavior.motion.map((m) => [m.on, m.property, m.reducedMotion])) : '');

// ---------- Accessibility ----------
function a11y() {
  const a = c.a11y || {};
  const rows = [['Role', a.role], ['Accessible name', a.name], ['Focus', a.focusIndicator], ['Minimum target', a.minTarget], ['Contrast', a.contrastNote]];
  const kb = a.keyboard?.length ? `**Keyboard**\n\n${bullets(a.keyboard)}` : '';
  const wcag = a.wcag?.length ? `**WCAG**: ${a.wcag.join(' · ')}` : '';
  const contrast = '<!-- contrast: measured contrast of the drawn variant (ratio and color pair); if not measured, delete it -->';
  return section(2, 'Accessibility', [table(['Requirement', 'Detail'], rows.filter((r) => r[1])), kb, wcag, contrast].filter(Boolean).join('\n\n'));
}

// ---------- History ----------
function history() {
  const log = git('log', '--format=%h|%ad|%s', '--date=short', '-n', '15', '--', contractRel);
  const rows = log ? log.split('\n').map((l) => l.split('|')) : [];
  return section(2, 'History', rows.length ? table(['Commit', 'Date', 'Change'], rows) : '_No git history for the contract yet._');
}

// ---------- Modes ----------
if (verifyFile) {
  const md = fs.readFileSync(verifyFile, 'utf8');
  const bad = [];
  if (!md.includes(c.version)) bad.push(`contract version ${c.version} does not appear in the Spec`);
  for (const s of SECTIONS) if (!new RegExp(`^##\\s+${s}\\b`, 'm').test(md)) bad.push(`missing section "${s}"`);
  if (/<!-- image:/.test(md)) bad.push('<!-- image:… --> markers remain, not replaced by an image');
  if (/<!-- contrast:/.test(md)) bad.push('the <!-- contrast: … --> marker remains (fill it in or delete it)');
  console.log(bad.length ? bad.map((b) => '✗ ' + b).join('\n') : `✓ Spec of ${c.name} v${c.version}: version and sections present`);
  process.exit(bad.length ? 1 : 0);
}

if (compareFile) {
  const f = JSON.parse(fs.readFileSync(compareFile, 'utf8'));
  const warns = [];
  // 1. Properties: contract <-> Figma
  const figmaProps = new Set(Object.keys(f.props || {}));
  const contractProps = new Map();
  for (const p of c.props || []) if (p.bindings?.figma) contractProps.set(p.bindings.figma.property, p.name);
  for (const a of Object.values(c.anatomy || {})) if (a.figmaToggle) contractProps.set(a.figmaToggle.property, '(figmaToggle)');
  for (const [fp, n] of contractProps) if (!figmaProps.has(fp)) warns.push(`the contract binds "${n}" to Figma property "${fp}" and it does not exist in Figma`);
  for (const fp of figmaProps) if (!contractProps.has(fp)) warns.push(`Figma has property "${fp}" and the contract does not bind it`);
  // 2. Figma tokens the contract does not cite ({…} placeholders match any segment)
  const pats = flattenTokens(c.tokens?.bindings).map(([, v]) => v).concat(flattenTokens(c.tokens?.scales).map(([, v]) => v)).filter((v) => typeof v === 'string')
    .map((v) => new RegExp('^' + v.split(/\{[^}]+\}/).map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.+') + '$'));
  const seen = new Set();
  const check = (t, where) => { if (!t || seen.has(t)) return; seen.add(t); const n = t.replace(/\//g, '.').toLowerCase().replace(/ /g, '-'); if (!pats.some((p) => p.test(n))) warns.push(`Figma uses "${t}" (${where}) and the contract does not cite it`); };
  for (const l of f.layers || []) {
    for (const p of [...(l.fills || []), ...(l.strokes || [])]) { if (p.token) check(p.token, l.path); else if (p.value && p.value !== 'IMAGE') warns.push(`value without variable in ${l.path}: ${p.value}`); }
    for (const t of [l.radius, l.gap, ...(l.pad || [])]) if (t?.token) check(t.token, l.path);
    if (l.text?.style) check(l.text.style, l.path);
    if (l.effectStyle) check(l.effectStyle, l.path);
  }
  // 3. Figma layers that are not in anatomy
  const layerNames = new Set(Object.values(c.anatomy || {}).map((a) => a.figmaLayer));
  const known = (n) => [...layerNames].some((ln) => ln && ln.toLowerCase().includes(n.toLowerCase()));
  for (const l of f.layers || []) { const leaf = l.path.split('/').pop(); if (l.path.includes('/') && !known(leaf)) warns.push(`Figma layer "${l.path}" is not in anatomy`); }
  console.log(warns.length ? warns.map((w) => '⚠ ' + w).join('\n') + `\n\n${warns.length} warning(s). Report them to the user; do not change the contract or Figma.` : '✓ Figma and contract match on what was checked');
  process.exit(0);
}

const header = `# Documentation\n\n**${c.name}** · v${c.version} · ${c.status}${c.category ? ' · ' + c.category : ''}\n`;
const anatomy = `## Anatomy\n\n${[breakdown(), specs(), properties(), tokens(), breakpoints(), motion()].join('\n')}`;
process.stdout.write([header, overview(), anatomy, a11y(), history()].join('\n'));
