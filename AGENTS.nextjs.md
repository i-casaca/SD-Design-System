# AGENTS.md — Next.js project

Copy this file to the project root as `AGENTS.md`. Rules for any AI agent working here.

## This project

- Next.js (App Router) + strict TypeScript. The `@/` alias points to `src/`.
- Styles: CSS Modules. No Tailwind, no style libraries, no inline styles.
- The design system lives in `design-system/` (submodule or copy). **It is not edited from here** unless expressly requested.
- Source of truth for each component: `design-system/contracts/<Component>.contract.json`.
- Tokens: `design-system/tokens/tokens.css`, imported in `src/app/globals.css`.

## Structure

```
src/
├── app/                              pages (App Router)
│   ├── globals.css                   imports tokens.css
│   └── playground/page.tsx           shows all components and variants
└── components/
    └── <name-in-kebab>/
        ├── <name>.tsx                component
        ├── <name>.module.css         styles
        ├── <name>.contract.json      copy of the contract (do not edit by hand)
        └── <name>.md                 documentation generated from the contract
design-system/                        contracts, tokens, docs, check.mjs
```

## Before creating or modifying a component

1. Read `design-system/contracts/<Component>.contract.json` in full. If it does not exist, **stop and ask**.
2. Read `design-system/docs/components.md` (props vocabulary).
3. Check the contract's `meta.needsReview`: these are known gaps. Do not fill them with assumptions: ask.
4. Check which components already exist in `src/components/` and reuse them (they are requested by `composition.nestedComponents` or `slot.allowedComponents`).

## Code rules

- **Props:** names, types and default values exactly as in `props`. Do not add or remove props.
- **Code-only props** (`bindings.figma: null`): implement them all the same.
- **Variants:** `variant`, `color`, `size`, etc. are exposed as `data-*` attributes on the element (`data-variant="solid"`) and styled with attribute selectors in the CSS Module. Do not generate dynamic classes.
- **Parts:** each key in `anatomy` carries `data-part="<key>"`. The `ref` goes on the part in `semantics.refTarget`.
- **Native states** (`states.native`): `:hover`, `:focus-visible`, `:active` in CSS.
- **Controlled states** (`states.controlled`): they are props and carry the ARIA attribute indicated in `aria`.
- **Slots:** respect `allowedComponents`, `minItems`, `maxItems`, `mandatory`. A slot is a prop or `children`.
- **Composition:** never put inside anything listed in `composition.forbiddenChildren`.
- **Types:** no `any`. Use named exports (`export function Button`), and export the props type (`ButtonProps`).
- **React:** if the project uses React 19, `ref` is a normal prop; with React 18, use `forwardRef`.
- **`"use client"`:** only on components with state, events or hooks. Nothing else.
- **Complex accessible behavior** (Checkbox, RadioGroup, Switch, AlertDialog): use the Radix primitives (`radix-ui`) for behavior and apply our styles with `data-*`. Do not reimplement focus, keyboard or ARIA by hand.

## Style rules

- Values come **only** from the contract's `tokens.bindings`. No hex, no loose px values, no colors outside the tokens.
- A contract token becomes a CSS variable like this: dotted path → hyphens, with a `--` prefix.
  `colors.accent.accent.9` → `var(--colors-accent-accent-9)`; `spacing.3` → `var(--spacing-3)`.
- `{color.step}.9` templates: resolve `tokens.scales.<color>.step` and repeat the CSS for each `color` value.
- `byHighContrast` only overrides what it indicates. `byState.disabled` applies with `disabled` or `aria-disabled`.
- `opacity` only with the numeric values the contract gives (hover/active). **Disabled never with opacity.**
- Dark mode: write nothing. The variables change with `data-theme="dark"`.
- Measurements with no token (heights, icon sizes) come from `layout`: use them as component values.

## Icons

- Only icons from `design-system/icons/registry.json`, imported from `src/components/icon/icons.ts` (generated). Never `import * as` or direct `lucide-react` imports in components.
- They are drawn with the `Icon` component (contract `Icon.contract.json`). Without `label` it is decorative (`aria-hidden`); with `label`, `role="img"`.
- The size is set by the parent component via CSS according to its `size` (the contract's `layout.iconSize`). The color is inherited (`currentColor`).
- If you need an icon that is not in the registry, do not import it: ask.

## Accessibility

Comply with the contract's `a11y`: role, accessible name, keyboard, visible focus, minimum target size, contrast. If `minTarget` warns that it is not met, make the label clickable too or add invisible padding, and say so in the summary.

## Things you do not do

- You do not invent props, variants, states or tokens.
- You do not touch `design-system/`.
- You do not edit `tokens.css` (it is regenerated).
- You do not install libraries without asking (`lucide-react` and `radix-ui` are already decided).
- You do not create components that have no contract.
- You do not import icons from outside the registry.

## When in doubt

Ask. If something is not in the contract, do not fill it with assumptions.

## When finished

If the `contract-to-component` skill is installed, use it to create or update components. Before accepting a component, run:
`node design-system/skills/contract-to-component/scripts/conformance.mjs src/components/<name> --ds design-system` (0 errors).

Reply with a short list:
1. Files created or changed.
2. Contract rules applied.
3. What you left out or were unsure about (the `meta.needsReview` items that affect the code).
4. How to test it (playground route).
