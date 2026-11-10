# Icons (Lucide)

The system uses [Lucide](https://lucide.dev/icons/) through the `lucide-react` package. There is a closed list of allowed icons and an `Icon` component that fixes size and accessibility.

```
icons/registry.json  ──(npm run icons:build)──►  icons.ts (re-exports only the allowed ones)
        ▲                                              │
  declared here                              components import from here
```

## Pieces

| Piece | What for |
| --- | --- |
| `icons/catalog.json` | ALL of Lucide (1,903 icons) with tags and categories. Generated; not edited by hand |
| `icons/registry.json` | List of icons allowed in code, with their usage. **Source of truth** |
| `scripts/build-icons.mjs` | Generates the re-export file from the registry |
| `scripts/build-icon-catalog.mjs` | Generates `icons/catalog.json` from Lucide (`npm run icons:catalog`) |
| `scripts/build-figma-icons.mjs` | Generates code batches to create the icons in Figma (`npm run icons:figma`) |
| `contracts/Icon.contract.json` | Contract of the `Icon` component (size, a11y) |
| `contracts/IconLibrary.contract.json` | Library rules: catalog, names, stroke and handoff to Figma |
| `check.mjs` | Validates the registry (PascalCase, no duplicates, with `use`) and that each icon exists in the catalog |

## 1. Install it in the Next.js project (once)

```bash
npm install lucide-react
```

Generate the icons file **inside the project** (so `lucide-react` resolves from its `node_modules`):

```bash
node design-system/scripts/build-icons.mjs src/components/icon/icons.ts
```

Add the script to `package.json`:

```json
"ds:icons": "node design-system/scripts/build-icons.mjs src/components/icon/icons.ts"
```

This generates `src/components/icon/icons.ts`:

```ts
import { ArrowRight, Check, Plus, Search, X /* … */ } from 'lucide-react';
export type { LucideIcon } from 'lucide-react';
export { ArrowRight, Check, Plus, Search, X /* … */ };
```

Then, create the `Icon` component from its contract (prompt in `docs/prompts-nextjs.md`, "Icons" section).

## 2. Declare a new icon

1. Find the name at [lucide.dev/icons](https://lucide.dev/icons/). In code the name is **PascalCase** (`arrow-right` → `ArrowRight`).
2. Add it to `icons/registry.json` with its usage:

```json
{ "name": "Download", "use": "download a file" }
```

3. `npm run icons:build` in the system repo (or `npm run ds:icons` in the project) and `npm run check`.
4. Commit in the system repo and, in the project, update the submodule.

If the name does not exist in Lucide, TypeScript fails at compile time: that is the check.

## 3. Use it in components

Components with an icon gap (`Button.icon`, `Button.iconEnd`, `IconButton.icon`, `TextField.icon`) receive a node. Whoever uses them passes an icon already drawn by `Icon`:

```tsx
import { Plus, ArrowRight } from '@/components/icon/icons';
import { Icon } from '@/components/icon/icon';
import { Button } from '@/components/button/button';

<Button icon={<Icon icon={Plus} />}>Add</Button>
<Button iconEnd={<Icon icon={ArrowRight} />}>Continue</Button>
```

Icon-only button (`aria-label` is required):

```tsx
import { X } from '@/components/icon/icons';
import { IconButton } from '@/components/icon-button/icon-button';

<IconButton icon={<Icon icon={X} />} aria-label="Close" variant="ghost" color="neutral" />
```

- **Size:** set by the parent component with CSS according to its `size` (Button and IconButton: 16 / 16 / 18 / 20; TextField: 14 / 16 / 16). Do not pass it by hand.
- **Color:** inherits `currentColor`; the parent already gives it its color through tokens.
- **Accessibility:** without `label`, the icon is decorative (`aria-hidden`). With `label` it carries `role="img"` and `aria-label`.
- **Icon only:** a button without text is not a `Button` with an icon, it is an `IconButton` (`contracts/IconButton.contract.json`) with a required `aria-label`.

Always import from `icons.ts` and never `import * as` from `lucide-react`: only that way are the allowed icons included in the bundle.

## 4. Full catalog and handoff to Figma

- **Catalog:** `icons/catalog.json` contains all of Lucide (1,903 icons) with tags and categories. It is generated with `npm run icons:catalog`, which downloads Lucide into `.cache/` the first time (`--update` to refresh it).
- **Registry:** `icons/registry.json` remains the list of icons the code can use. The catalog is the universe; the registry, its allowed subset.
- **Figma:** `npm run icons:figma` prepares code batches in `.cache/figma/` to create the icons as components in Figma via MCP (`use_figma`). By default it uses the registry; `--all`, `--category` or `--names` change the selection.

## 5. Rules for the agent

- Only icons from `icons/registry.json`. If it needs another, look it up in `icons/catalog.json` and propose the entry for the registry (PascalCase name and `use`); do not add it without asking.
- It does not paint or size the icon on its own.
- After adding one: `icons:build` and `check`.

## 6. Alternative: Phosphor

The system offers [Phosphor](https://phosphoricons.com) as a second library. **A project picks one of the two and does not mix them.** The rules are in `contracts/PhosphorIconLibrary.contract.json`; the circuit is the same as with Lucide, in `icons/phosphor/`:

| Piece | Lucide | Phosphor |
| --- | --- | --- |
| Catalog (generated) | `icons/catalog.json` · `npm run icons:catalog` | `icons/phosphor/catalog.json` · `npm run phosphor:catalog` (1,512 icons, from `phosphor-icons/core`) |
| Registry (source of truth) | `icons/registry.json` | `icons/phosphor/registry.json` |
| Re-export | `npm run icons:build` | `npm run phosphor:build` |
| Figma | `npm run icons:figma` → `.cache/figma/` | `npm run phosphor:figma` → `.cache/figma-phosphor/` (batches + `entry.js`) |
| Contract | `IconLibrary` | `PhosphorIconLibrary` |

Differences that matter:

- **Weights:** Phosphor has 6; the system allows **regular** (default) and **fill** (only for the active or selected state of the same icon). In Figma, each icon is a component set with a `Weight` property (Regular / Fill).
- **Figma, a single component for everything:** you always insert **"Phosphor Icon"**. In its panel you choose the icon (`Icon` property, with a search over the whole catalog; registry icons appear first) and the weight (`Weight`). When you change the icon, the weight is kept. Order: first the `batch-NNN.js` batches, last `entry.js`, which can be repeated when you add icons.
- **Names:** the package exports `MagnifyingGlassIcon`; the registry and `icons.ts` use `MagnifyingGlass`. This way components import the same way with both libraries.
- **Drawing:** 16 px grid (viewBox 256) and filled shapes, not stroke. In Figma, the color goes on the fill (`--fill-variable`).
- **Next.js:** `icons.ts` imports from `@phosphor-icons/react/ssr` (no context, works in Server and Client Components). Optional: add `@phosphor-icons/react` to `experimental.optimizePackageImports`.
- **Equivalences of the initial registry:** ChevronDown → CaretDown, EyeOff → EyeSlash, Search → MagnifyingGlass, Trash2 → Trash; the rest are named the same.

In the Next.js project that uses Phosphor:

```bash
npm install @phosphor-icons/react
node design-system/scripts/build-phosphor-icons.mjs src/components/icon/icons.ts
```

Pending: `Icon.contract.json` is written for Lucide (`LucideIcon` type, no `weight`). To use fill through `Icon`, that contract must be changed first.

## To review

- **Figma:** Radix components use their own icons (by default, "Design / blending-mode"). With Lucide the look changes: review each instance swap in Figma.
- **Stroke:** `strokeWidth` 2 is Lucide's default. Radix icons are 15px with a different stroke; decide whether to adjust to 1.5.
- **Server Components:** `lucide-react` icons do not use state; if Next.js complains in some case, add `"use client"` to the component that imports them.
- **Initial registry:** 11 sample icons; replace them with the ones you use.
