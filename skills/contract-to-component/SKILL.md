---
name: contract-to-component
description: Implements a React + TypeScript component (tsx and CSS Module) from its design system JSON contract and verifies that the code conforms to the contract. Use it when asked to "create the <X> component from its contract", "implement the <X> contract in tsx", "check that <X> conforms to the contract" or "update the component after the contract changed".
---

# contract-to-component

Turns `contracts/<Name>.contract.json` into code and **proves** it conforms. The contract rules: if code and contract disagree, the error is in the code, or the contract must be changed first.

The sibling skill `ui-contract-builder` creates the contracts. This one only consumes them; it does not modify the design system.

## What it guarantees and what it does not

- **Guarantees (checked by script):** same props, types and defaults; same parts (`data-part`); same states and ARIA attributes; **only** the contract's tokens, no loose colors or measurements, no opacity on disabled; contract copy identical to the original.
- **Does not guarantee:** that the render is pixel-for-pixel like Figma (fonts, focus ring geometry, gradients without a variable, spinner). That is reviewed with `references/parity.md`.

## Step 0 — Locate

1. **Contract:** `<system>/contracts/<Name>.contract.json` (the system is usually in `design-system/`). If it does not exist, **stop and ask**; do not invent it (you can suggest using `ui-contract-builder`).
2. **Project rules:** read the project's `AGENTS.md` (`AGENTS.nextjs.md` is its template). It overrides the defaults below.
3. **Stack:** `package.json` (React 18 or 19, `radix-ui`, `lucide-react`), `@/` alias, where `components/` is, whether `tokens.css` is imported in `globals.css`.
4. **Defaults** if the project says nothing else: Next.js App Router, strict TypeScript, CSS Modules, states with `data-*` attributes, folder `src/components/<id>/`.

## Non-negotiable rules

1. **Props exactly as in the contract.** Name, type, default and required-ness. Do not add or remove. Code-only props (`bindings.figma: null`) are implemented too.
2. **Values only from `tokens.bindings`.** CSS variables with the rule `colors.accent.accent.9` → `var(--colors-accent-accent-9)`. No hex, no loose px (except the contract's numbers: `layout`, border widths), no `style={{}}`.
3. **Disabled never with opacity.** Opacity only with the contract's numeric values (hover/active).
4. **Parts and ref:** every `anatomy` key (except `element: "css"`) carries `data-part="<key>"`. The `ref` goes on `semantics.refTarget`.
5. **States:** `native` ones with CSS (`:hover`, `:focus-visible`, `:active`); `controlled` ones are props with their ARIA/HTML attribute.
6. **`meta.needsReview` is not filled with assumptions.** For what affects the code: ask, or implement it marked with `TODO(contract): <reason>` and mention it in the summary.
7. **Dependencies:** reuse the components required by `composition.nestedComponents` or `slot.allowedComponents` that already exist. If one does not exist, **stop and list what is missing**; do not recreate it inside.
8. **Contract first.** If something in the contract is impossible, contradictory or wrong, do not fix it in the code: propose the contract change (with the version that goes up) and wait.
9. **Do not touch the design system** (`design-system/`), nor `tokens.css`. Do not install libraries without asking.
10. **Complex accessible behavior** (Checkbox, RadioGroup, Switch, AlertDialog…): `radix-ui` primitives + our styles with `data-*`. Do not reimplement focus or keyboard.

## Procedure

1. **Read** the whole contract, `docs/components.md` (vocabulary) and `meta.needsReview`. Note which items affect the code.
2. **Check dependencies** (rule 7). If any are missing, stop.
3. **Short plan** (only if asked, or if the component has complex behavior or Radix): props, parts→elements, which primitive, which `needsReview` items affect you, doubts. Wait for approval.
4. **Create the folder** `src/components/<id>/` with:
   - `<id>.contract.json`: exact copy (`cp`), untouched.
   - `<id>.module.css`: see step 5.
   - `<id>.tsx`: starts with `/** @contract <Name>@<version> */`; `export function <Name>` and `export interface <Name>Props`; `"use client"` only if there is state, own events or hooks. See `references/implementation-map.md` and `assets/example/icon-button/` (a real component that passes the verifier).
5. **Token CSS:**
   - If the contract has `byVariant`, `bySize`, `byHighContrast` or `byState`: **generate** the block, do not write it by hand:
     `node <skill>/scripts/gen-css.mjs <contract> --ds <system> --write src/components/<id>/<id>.module.css`
     It writes between `/* @generated:start */` and `/* @generated:end */`; the rest of the file is yours. If the script warns about "untranslated keys", write those yourself from the contract (see implementation-map).
   - Write by hand only what the contract does not have as a token: element reset, icon size (`layout.iconSize`), focus, loading.
6. **Verify:** `node <skill>/scripts/conformance.mjs src/components/<id> --ds <system>`. It must give **0 errors**. If it fails, fix the code (rule 8 if it is the contract). Repeat.
7. **Verify the project:** `tsc --noEmit` (or `npm run build`), `npm run lint`. Add the component to the playground with all its variants, sizes and states.
8. **Parity with Figma:** if asked, or if the component is critical, `references/parity.md`.
9. **Summary** (short): files created; contract rules applied; `needsReview` / `TODO(contract)` items that remain; verifier result; how to try it (playground route).

## Updating a component when the contract changes

1. Compare the tsx's `@contract` version with the contract's.
2. Copy the contract again, regenerate the block with `gen-css`, adjust the tsx (new props, parts, states), bump the `@contract` comment.
3. Run the verifier; any error is a real difference between code and contract.

## References

- `references/implementation-map.md` — from each contract block to its code (with tsx and CSS patterns, Radix, React 18/19).
- `references/parity.md` — what "identical to Figma" means, how to check it and what is left out.
- `assets/example/icon-button/` — complete IconButton: contract, tsx, CSS with generated block.
- `scripts/gen-css.mjs`, `scripts/conformance.mjs`, `scripts/lib.mjs` — Node 18+, no dependencies.
