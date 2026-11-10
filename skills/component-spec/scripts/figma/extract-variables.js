// READ-ONLY. Extracts from a component drawn in Figma the data the Spec uses:
// bound variables (with their alias chain), text styles, padding, gap, radius and sizes.
// Run with use_figma / figma_execute. Edit only the parameters.
// Output: a compact JSON string; save it as figma.json and pass it to build-spec.mjs --figma.
const NODE_ID = 'PUT_ID_HERE';   // COMPONENT_SET or COMPONENT, with ":" (not "-")
const VARIANT = '';                 // text the name of the variant to measure must contain; '' = the contract's defaultVariant

const hex = (c, a = 1) => '#' + [c.r, c.g, c.b].map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('') + (a < 1 ? ' @' + Math.round(a * 100) + '%' : '');
const vcache = {};
const getVar = async (id) => (vcache[id] ??= await figma.variables.getVariableByIdAsync(id));
// Follows aliases down to the final value in the first mode of each collection.
const resolve = async (id) => {
  const chain = []; let v = await getVar(id); let value = null;
  for (let i = 0; v && i < 10; i++) {
    chain.push(v.name);
    const col = await figma.variables.getVariableCollectionByIdAsync(v.variableCollectionId);
    value = v.valuesByMode[col.modes[0].modeId];
    if (value && value.type === 'VARIABLE_ALIAS') v = await getVar(value.id); else break;
  }
  return { token: chain[0], via: chain.slice(1), value };
};
const paintInfo = async (paints) => {
  const out = [];
  for (const p of paints || []) {
    if (p.visible === false) continue;
    const b = p.boundVariables && p.boundVariables.color;
    if (b) { const r = await resolve(b.id); out.push({ token: r.token, via: r.via, value: r.value && r.value.r !== undefined ? hex(r.value, p.opacity ?? 1) : null }); }
    else out.push({ token: null, value: p.type === 'SOLID' ? hex(p.color, p.opacity ?? 1) : p.type });
  }
  return out;
};
const numInfo = async (node, field) => {
  const b = node.boundVariables && node.boundVariables[field];
  if (b) { const r = await resolve((Array.isArray(b) ? b[0] : b).id); return { token: r.token, via: r.via, value: r.value }; }
  return { token: null, value: node[field] };
};

const root = await figma.getNodeByIdAsync(NODE_ID);
if (!root) return JSON.stringify({ error: 'Node not found: ' + NODE_ID });
let comp = root;
if (root.type === 'COMPONENT_SET') {
  comp = (VARIANT && root.children.find((c) => c.name.includes(VARIANT))) || root.defaultVariant;
}
const out = { id: root.id, name: root.name, type: root.type, variant: comp.name, props: {}, layers: [] };
if (root.type === 'COMPONENT_SET' || root.type === 'COMPONENT') {
  const defs = root.componentPropertyDefinitions || {};
  for (const [k, d] of Object.entries(defs)) out.props[k.split('#')[0]] = { t: d.type, d: d.defaultValue, o: d.variantOptions };
}
const walk = async (n, path, depth) => {
  const L = { path, type: n.type, w: Math.round(n.width), h: Math.round(n.height), visible: n.visible };
  if ('fills' in n) L.fills = await paintInfo(n.fills);
  if ('strokes' in n && n.strokes.length) { L.strokes = await paintInfo(n.strokes); L.strokeWeight = n.strokeWeight; }
  if ('cornerRadius' in n && n.cornerRadius !== 0) L.radius = await numInfo(n, 'topLeftRadius');
  if ('layoutMode' in n && n.layoutMode !== 'NONE') {
    L.layout = n.layoutMode; L.sizing = [n.layoutSizingHorizontal, n.layoutSizingVertical];
    L.pad = [await numInfo(n, 'paddingTop'), await numInfo(n, 'paddingRight'), await numInfo(n, 'paddingBottom'), await numInfo(n, 'paddingLeft')];
    L.gap = await numInfo(n, 'itemSpacing');
  }
  if ('effectStyleId' in n && n.effectStyleId) { const s = await figma.getStyleByIdAsync(n.effectStyleId); L.effectStyle = s && s.name; }
  if ('opacity' in n && n.opacity !== 1) L.opacity = n.opacity;
  if (n.type === 'TEXT') { const s = n.textStyleId ? await figma.getStyleByIdAsync(n.textStyleId) : null; L.text = { style: s ? s.name : null, chars: n.characters }; }
  out.layers.push(L);
  if ('children' in n && n.type !== 'INSTANCE' && depth < 4) for (const k of n.children) await walk(k, path + '/' + k.name, depth + 1);
};
await walk(comp, comp.name, 0);
return JSON.stringify(out);
