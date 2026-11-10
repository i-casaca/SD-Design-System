# Reading a component from Figma

Tool: `use_figma` from the Figma MCP, **read-only**. Before the first call, load the `figma-use` skill (mandatory). Typical parameters: `fileKey`, `description`, `skillNames: "resource:figma-use"`, `code`.

URL → ids: `figma.com/design/<fileKey>/...?node-id=1129-78567` → `fileKey` and `nodeId = 1129:78567` (the hyphen becomes a colon). For a URL with `/branch/<branchKey>/` use `branchKey` as `fileKey`.

## Limits

- The output is cut off at ~20 KB: read in chunks (one size, one state, one color) and return compact strings, not objects.
- Do not loop over the 700+ variants with full output. Filter by one size and deduce the rest; note in `needsReview` what you only read at one size.
- Write null-safe code: `find(...)` can return `undefined` in variants that hide layers.

## Read 1 — structure and properties

```js
const n = await figma.getNodeByIdAsync('NODE_ID');
const out = { name: n.name, type: n.type };
if (n.type === 'COMPONENT_SET') {
  out.defs = Object.fromEntries(Object.entries(n.componentPropertyDefinitions)
    .map(([k, v]) => [k, { t: v.type, d: v.defaultValue, o: v.variantOptions }]));
  out.count = n.children.length;
  const tree = (x, d = 0) => ({ n: x.name, t: x.type, v: x.visible, w: Math.round(x.width), h: Math.round(x.height),
    txt: x.type === 'TEXT' ? x.characters : undefined,
    c: 'children' in x && d < 4 ? x.children.map(k => tree(k, d + 1)) : undefined });
  out.tree = tree(n.children[0]);
}
return JSON.stringify(out);
```

From this you get: `props` (with `bindings.figma`), the number of variants, `anatomy` (layers) and which layers are toggled by BOOLEAN (`figmaToggle`).

## Read 2 — tokens per variant

Resolve variables by id, with a cache, and use short names so it fits.

```js
const cache = {};
const vn = async (id) => { if (!id) return null;
  if (!cache[id]) { const v = await figma.variables.getVariableByIdAsync(id); cache[id] = v ? v.name : id; }
  return cache[id]; };
const paint = async (arr) => { if (!arr || !arr.length) return '-'; const o = [];
  for (const p of arr) { const b = p.boundVariables && p.boundVariables.color;
    o.push(b ? await vn(b.id) : p.type === 'SOLID' ? '#raw' : p.type); } return o.join('>'); };
```

For each variant: `fills`, `strokes`, `strokeWeight`, `effectStyleId` (shadow style), `opacity`, radius (`boundVariables.topLeftRadius`), `textStyleId`. A `#raw` value or one without a variable = not bound → `needsReview`.

Text: `textStyleId` → `(await figma.getStyleByIdAsync(id)).name` (e.g. `Typography/3/Regular` → `text-style.3.regular`).

## Known quirks (always check them)

- **Where the color is.** The root node often has an empty "raw" fill and the real color is on a child (`content-container`). Read the child, not just the root.
- **Opaque instances.** Icons and other instances do not let you read their inner fills in some variants. Confirm only the readable cases and mark the rest as assumed.
- **✦ in default values** (`solid ✦`, `2 ✦`, `default ✦`): the real name has no mark. And the component set's default may not be the ✦ one (`defaultVariant`).
- **Name typos** (`highConstrast`): `bindings.figma.property` goes as it is in Figma; the code prop gets the correct name. Verify each component, do not copy the typo.
- **Variants that only exist with one state** (e.g. `loading=true` only with `state=disable`): note it in `needsReview`.
- **Hover/active opacity and gradients** are usually fixed, without a variable. Do not invent a token.
- **Sizes without a variable** (height, width, icon size): noted as values, and the match with existing tokens is pointed out only if the value matches.
- **Alpha of the bound color**: `paint.opacity` already carries the variable's alpha; do not treat it as a separate opacity.
- **Undesigned states** (hover, focus): `states.native` lists them, but `needsReview` says "no design in Figma".
- **Space between icons and text, padding**: if no variable is bound, do not put `spacing.N` by intuition; compare the value with the scale and say it is by coincidence.

## What is NOT taken from Figma

`description`, `guidance`, `a11y`, `events`, `testing`, `anchors.code`. Draft them yourself and mark the decisions.
