# Contract guide

How `contracts/<Component>.contract.json` works, and how to fill it in, run it and document it. Open it alongside `Button.contract.json` (action component) and `TextField.contract.json` (field with slots).

## 1. What it is and what it is not

A contract is **data about a component**, not code or design. It answers: what is it for? what is it not for? which props, parts, slots and states does it have? which tokens can it use and where? how is it made accessible?

Principle: the contract holds **what neither code nor Figma can say on their own** (intent, limits, rules). What can be read from code (`props.type`, `props.default`, measurements) is marked in `meta.derivableFromSource`: it is a candidate to be generated instead of written.

## 2. Core blocks and optional blocks

**Core (required in every component):** `id`, `name`, `version`, `status`, `description`, `guidance`, `semantics`, `props`, `states`, `anatomy`, `tokens`, `a11y`.

**Optional:** remove from the template those that do not apply, or leave them as `null`.

| Component type | Also add |
| --- | --- |
| Action (Button, IconButton) | `events`, `layout`, `behavior` (loading), `content` |
| Container (Panel, Modal) | `composition` + slots in `anatomy`, `layout` |
| Form field (Input, Select, Checkbox) | `form` (control, label, validation, error message), `events` |
| Layer (Dialog, Popover, Menu, Tooltip) | `overlay` (placement, closing, trapped focus, z layer), `events` |
| Data (Table, List) | `data` (rows, columns, sorting, selection, empty, loading) |
| Media (Avatar, Image) | `media` (aspect ratio, fit, fallback, alt text) |
| Navigation (Tabs, Breadcrumb) | `composition`, `events`, extensive `a11y.keyboard` |

Over time, the contract of a complex component grows; that of a simple one stays in the core.

## 3. Slots and composition

- **Slot**: a gap that receives another component. It goes in `anatomy.<part>.slot` with `key`, `allowedComponents` (which components fit), `minItems`, `maxItems`, `mandatory` and `figmaProp` (the Figma property that represents it).
- **Content**: a part filled with a text/node prop: `anatomy.<part>.content.prop`.
- **Fixed nested component**: `composition.nestedComponents` (e.g. a spinner that is always present).
- **Prohibitions**: `composition.forbiddenChildren` (Button does not allow another Button inside).
- In code, each slot is usually a prop (`header`, `footer`) or `children`. In the contract, the prop is linked with `bindings.figma.type: "SLOT"` or `"INSTANCE_SWAP"`.

**Parts named in Figma:** `figmaLayer` (exact layer name) and `figmaToggle` (Figma boolean that shows or hides a part and does not exist as a prop in code, like `backdrop`). This way, no Figma property is left without a match.

**Compound code API** (Radix, Ark, shadcn: Root, Trigger, Content…): describe it in `composition.codeParts`; the contract is still one per component.

The three cases are distinguished on purpose: slot (gap), instance swap (changing an icon) and nested component (fixed part).

## 4. Tokens: policy and bindings

- `tokens.policy.allowed`: token categories it may use. `forbidden`: what it never may (`primitive`).
- `tokens.bindings.base`: what does not change. `byVariant`: color per `variant` value. `byState`: controlled states (`disabled`).
- A token can carry `{prop}`: it is expanded with the values of that prop. `size.control.{size}` means `size.control.s`, `.m` and `.l`.
- `null` means "does not apply" (a primary has no border).

### When Figma and code do not match on the property type

- **Boolean in code, variant value in Figma** (`disabled` ↔ `state=disable`, `loading` ↔ `loading=true`): `bindings.figma` carries `value` with the Figma value equivalent to `true`: `{ "property": "state", "type": "VARIANT", "value": "disable" }`.
- **Color matrix** (variant × color × state × highContrast): `tokens.scales` maps each `color` value to its token paths (`step`, `alpha`, `fg`…) and the bindings use `{color.step}.9`. `null` = does not exist for that value. `byHighContrast` only stores what changes with the prop. `check.mjs` expands all combinations and checks that every token exists.
- Figma default values are marked with ✦ (`solid ✦`). The contract uses the value without the mark.

## 5. Filling it in by hand, in 8 steps

1. Copy `_template.contract.json` to `contracts/<Component>.contract.json`.
2. Fill in `id`, `name`, `category`, `description`. You decide this; it does not come from Figma.
3. Write `guidance`: 2–4 `dos`, 2–4 `donts` with `useInstead`, and `related`.
4. Move the **Figma properties** into `props`, with their `bindings.figma`. Names per `docs/components.md`.
5. Move the **interaction variants** into `states.native` and the rest into `states.controlled`.
6. Move the **layers** into `anatomy`. Gaps go as `slot`.
7. Note the **tokens** in `tokens.bindings`. If something in Figma does not use a variable, do not invent a token: note it in `meta.needsReview` and fix it in Figma.
8. Fill in `a11y` and `anchors`, delete the optional blocks you do not use, and run the check.

## 6. Running it

```bash
node check.mjs        # or: npm run check
```

No dependencies (just Node). For each contract, it checks:

- that all core blocks are present and no `<...>` placeholders remain;
- props and Figma properties have no duplicates; `content.prop` points to a real prop;
- slots have `allowedComponents`; `refTarget` is a part of `anatomy`;
- that every cited token exists in `tokens.json`, is not `forbidden` and is in `allowed` (expands `{size}`);
- that the tokens in `tokens.json` point to existing primitives.

Output: errors (fail with exit code 1) and warnings (`related` without a contract, pending anchors). In addition, `component.schema.json` validates the format in the editor: when you open a contract in VS Code it flags the missing fields.

Without Node, ask the AI: "Review `contracts/Button.contract.json` against `tokens/tokens.json` and `AGENTS.md`. List errors, do not change anything."

## 7. Documenting it

- **The contract is the source documentation.** Do not write a second version by hand.
- For a page readable by people, generate it: "Read `Button.contract.json` and generate `button.md` with: description, do's and don'ts, props table, states, anatomy (with slots), tokens and accessibility. Do not invent anything that is not in the contract." Save it next to the component in Next.js.
- `docs/components.md` is the index. Update it when you create a component or change its status.
- Every change: bump `version` (patch: text; minor: new prop or state; major: rename or remove) and commit the contract first.

## 8. Figma

See `docs/figma.md`.

## 9. The skill

`skills/ui-contract-builder/` does steps 2–7 by reading Figma (or a mini-spec if the component is new) and makes clear what Figma does not know (`description`, `guidance`, `a11y`) and what needs review (`meta.needsReview`). Installation and use: `skills/ui-contract-builder/references/project-setup.md`.
