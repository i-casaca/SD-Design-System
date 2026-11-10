# Using the contract with Figma

Figma and the contract do not update each other: **they are compared**. If they do not match, you decide which one is right and change the other.

## 1. Prepare the component in Figma

- **Variables named by usage**, not by appearance: `color/fill/brand/default`, not `strong-blue`. Two levels: primitives and semantics.
- **Component set** with clean properties:
  - Variant → visual variants (`Variant`, `Size`).
  - Boolean → switches (`Loading`, `Disabled`, `Full width`).
  - Text → labels (`Label`).
  - Instance swap → swapping an icon (`Icon start`, `Icon end`).
  - Slot → gaps that receive free-form content (`Header`, `Body`, `Footer`).
- **Auto layout** everywhere, and layers with stable names: `root`, `icon`, `label`... the same keys as `anatomy`.
- **Component description**: paste the contract's `description` and the path `contracts/<Component>.contract.json`.

## 2. What maps to what

| In Figma | In the contract |
| --- | --- |
| Component set name | `name` |
| Component property | `props[]` with `bindings.figma.property` and `.type` |
| `Hover`, `Focus`, `Pressed` variants | `states.native` |
| `Disabled`, `Loading`, `Error` variants or booleans | `states.controlled` |
| Layer names | keys of `anatomy` |
| Slot or instance swap property | `anatomy.<part>.slot.figmaProp` |
| Auto layout panel | `layout.autoLayout` |
| Applied variables | `tokens.bindings` |
| Link to the node | `anchors.figma.file` and `.node` |

The name in `bindings.figma.property` must be **identical** to the one in Figma, capitalization included.

## 3. What is NOT in Figma

`description`, `guidance`, `a11y` and `events` are decided by you (with development). You can leave an annotation in Figma that points to the contract, but the source is the contract.

## 4. Flow: from Figma to the contract

**By hand:** steps 4–7 of `docs/contract-guide.md`.

**With Claude and the Figma MCP (no skill):**

1. Give it the component link (right-click → copy link to selection).
2. Prompt:
   > Read this Figma component: <link>. Use `contracts/_template.contract.json` and `docs/contract-guide.md`. Fill in only what can be deduced from Figma: `name`, `props` (with `bindings.figma`), `states`, `anatomy`, `layout`, `tokens.bindings` and `anchors`. Leave `description`, `guidance` and `a11y` with placeholders. Note anything doubtful in `meta.needsReview`. Save to `contracts/<Component>.contract.json` and run `node check.mjs`.
3. Review the result yourself. The AI gets the mechanical parts right and fails on intent.

## 5. Flow: check that Figma and the contract match

> Compare the Figma component <link> with `contracts/<Component>.contract.json`. List: (1) Figma properties missing from the contract, (2) contract props with no Figma property, (3) layers not in `anatomy`, (4) values with no variable. Do not modify anything.

Do it every time the component changes in Figma and before requesting code changes.

## 6. What not to do

- Do not write loose measurements or colors in the contract: reference tokens.
- Do not rename a property in Figma without changing `bindings.figma.property` (and bumping `version` to major if the API changes).
- Do not use `opacity` for disabled: use the `*.disabled` tokens.
