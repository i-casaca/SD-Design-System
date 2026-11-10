---
name: ui-contract-builder
description: Creates, updates and validates UI component contracts (JSON) for a design system, from a Figma component or from a mini-spec. Use it when asked to "create the contract for <component>", "contract from this Figma node", "contract for a new component (Navbar…)", "compare Figma with the contract" or "generate the component in Figma from the contract".
---

# ui-contract-builder

A **contract** is one JSON per component: the neutral agreement between Figma and code (props, states, anatomy, tokens, accessibility, usage guidance). This skill creates and maintains it, in any project.

It does not generate component code. Another task does that by *reading* the contract.

## Step 0 — Locate the design system

1. Look for the folder with `contracts/component.schema.json` (in the current directory, in `design-system/`, or in the one the user points to). That is the **system root**.
2. If it does not exist, ask whether to create it: copy `assets/component.schema.json` and `assets/_template.contract.json` to `<root>/contracts/` and `scripts/check.mjs` to `<root>/check.mjs`.
3. Read, if they exist: `<root>/AGENTS.md`, `<root>/docs/components.md` (props vocabulary, index), `<root>/tokens/` (to know which tokens exist).
4. If the root is a submodule or a copy inside another project, **contracts are written in the system root**, not in the project that consumes it. Say so.

## Non-negotiable rules

1. **Do not change the schema or the contract structure without asking** (use AskUserQuestion with 2–3 options). It fits in free fields (`composition`, `layout`, `behavior`, `meta`) without touching the schema; say so.
2. **Only what the source says.** Anything you cannot read or that is an assumption goes to `meta.needsReview`, with the cause ("instance not readable", "value without variable"). Never invent tokens or fill them in "by analogy" without noting it.
3. **Tokens are paths that exist.** If something in Figma does not use a variable, do not write the loose value: note it in `needsReview`.
4. **Figma reads are read-only**, in small chunks (output is cut off at ~20 KB), with code that tolerates missing layers.
5. **If only the JSON is requested, deliver only the JSON** (plus any dependent files you changed). Do not regenerate or package the project.
6. **Product content** (`description`, `guidance`, `a11y`) is drafted by you. When delivering, state the decisions you made (default values, what counts as a "don't use").
7. **Never declare something verified if you did not read it.** Distinguish "read in Figma" from "copied from another component" from "assumed".
8. Content language: the project's (English by default). Prop names, ids and tokens stay as they are.

## Choose the mode

| The user says… | Mode |
| --- | --- |
| "Contract for this component" + Figma link | **A. Figma → contract** |
| "Contract for a new component" + mini-spec or description | **B. Spec → contract** |
| "Create/draw the component in Figma from the contract" | **C. Contract → Figma** |
| "Does Figma match the contract?" / "Update the contract" | **D. Compare and sync** |

### A. Figma → contract

1. Extract `fileKey` and `nodeId` from the link (`node-id=1129-78567` → `1129:78567`). See `references/figma-reading.md`.
2. Read, in this order: type and properties of the component set → a sample variant (layer tree) → tokens per variant, state and size → measurements.
3. Copy the template and fill it in following `references/contract-format.md`. If it is similar to an existing one, open that first and reuse its structure (`assets/example.*`).
4. Figma default values marked with ✦: use the value without the mark.
5. Continue with **When done**.

### B. Spec → contract (new component)

1. Ask for the mini-spec (`references/mini-spec.md`). If it is missing, do not invent it: ask for at least purpose, required content, responsive behavior and the main action.
2. Reuse components that already have a contract (`composition.nestedComponents`, `slot.allowedComponents`). If you depend on one that does not exist, say so.
3. If it is composite (Navbar, Tabs, Table…), read `references/composite-components.md`.
4. Leave `anchors.figma.node` as `—` and `bindings.figma` as `null` until it exists in Figma. `status: draft`.
5. Everything you decide on your own goes to `meta.needsReview` as "proposed decision: …", and the spec's "Open decisions" section is returned as questions.
6. Continue with **When done**.

### C. Contract → Figma

Read `references/contract-to-figma.md` and the `figma-use` skill (mandatory before writing to Figma). Before creating, check that the target file has the variables and components the contract cites; if not, stop and say so. At the end, check that everything is bound to variables. Last step: invoke the `component-spec` skill to generate the Spec of the drawn component.

### D. Compare and sync

Read Figma as in A, compare with the contract and list: (1) missing Figma properties, (2) props without a Figma property, (3) layers that are not in `anatomy`, (4) values without a variable, (5) differing tokens. Change nothing until they choose which one wins. When applying, bump `version` (patch: text; minor: new prop or state; major: rename or remove). If the change was also applied in Figma, finish by invoking `component-spec` to regenerate the Spec with the new version.

## When done

1. **Validate:** `node <skill-path>/scripts/check.mjs <root>`; it must give 0 errors. Fix and repeat. Add a quick negative test (a fake token) if the contract has new tokens.
2. **Fix dependents:** `guidance.related` in other contracts, `composition.nestedComponents`, `docs/components.md`, README and the component order in the prompts. If a "related without contract" warning disappears, good.
3. **Deliver:** the contract (and the dependent files changed). Summarize in 5–8 lines: what was read from Figma, what decisions you made, what needs manual review (`needsReview`), and whether you changed anything outside the contract.

## References (read them only when needed)

- `references/contract-format.md` — blocks, what goes in each, names, Figma ↔ code binding and token conventions. **Always when writing a contract.**
- `references/figma-reading.md` — how to read a component with `use_figma`, snippets, and the Figma quirks we already know.
- `references/composite-components.md` — composite components (slots, subcomponents, responsive).
- `references/mini-spec.md` — template to request/fill in the spec.
- `references/contract-to-figma.md` — generating the component in Figma from the contract.
- `references/project-setup.md` — installing the skill in another project or in a Next.js project.
- `assets/example.Link.contract.json` (simple), `assets/example.IconButton.contract.json` (variant × color × state matrix with `tokens.scales`).
