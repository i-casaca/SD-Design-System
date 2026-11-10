# Plan · Order in Figma + Specs from the contract

Branch: `exp/figma-specs-organizacion` · Figma target: **SDD Library** (`zljuuqX4X2LAFNuWB4SQj7`) · Status: draft

Idea: the DS agent (skill `ui-contract-builder`, mode C) is the control node. Every time it draws a component, it puts it in its place and generates its Spec. Nothing is drawn "floating".

## Golden rule

`contract.json` → (Figma: section + component set) → (Figma: Spec) → `node check.mjs`.
The Spec is **generated** from the contract. It is never written by hand (`docs/contract-guide.md` §7).

## Phase 0 · Checks (read-only)

- [ ] `figma_list_open_files`: confirm SDD Library is active, with the user's OK.
- [ ] `whoami` (official Figma MCP): does the file's plan have `specs_enabled: true`? If not, the native Spec does not exist and plan B is used (phase 2).
- [ ] Look in Radix Themes (read-only) at what its sections and headers look like, to copy the pattern, not the style.

## Phase 1 · Page and section structure

One page per component, with an SDD Library-specific format (different from Radix):

```
Page "Button"
└─ Section "Button"
   ├─ Header (instance of a _Header component: name, version, status, contract path)
   ├─ Section "Variants"   → the COMPONENT_SET
   ├─ Section "Examples"   → instances, one per relevant variant
   └─ Spec (SPEC_BLOCK)    → the documentation
```

- [ ] Create the `_Header` component (local, with a `_` prefix so it is not published as DS). Text fields: `name`, `version`, `status`, `contract`.
- [ ] Fixed pages at the start: `Cover`, `Foundations` (tokens), `Icons`, a `----` separator, and then one per component.
- [ ] Add to `references/contract-to-figma.md` the rule: "create or reuse the component's Section and its Header before creating the set".

## Phase 2 · "Zeroheight-style" Spec generated from the contract

A single template (`docs/spec-template.md`) that the agent fills from the JSON:

1. `# <name>` + version and status line
2. `## Description` ← `description`
3. `## When to use / not to use` ← `guidance`
4. `## Props` (table) ← `props[]`
5. `## Variants and states` ← `states`, with a link to each example in the "Examples" Section
6. `## Anatomy` ← `anatomy`
7. `## Tokens` (table) ← `tokens.bindings`
8. `## Accessibility` ← `a11y`
9. `## Code` → a ```tsx block (component usage) and a ```json block (the contract, or its relevant part)
10. `## Source` → GitHub permalink to the contract (never a local path)

- [ ] Script `scripts/build-spec.mjs <Component>` that produces the Markdown. This way the Spec is reproducible and does not depend on the agent.
- [ ] "Reference" ```json block: only `props` (name, type, values, default) and `tokens.bindings`. The whole contract stays in the `## Source` permalink.
- [ ] The agent creates the Spec with `figma.spec.createOnCanvasAsync` the first time and updates it with `editContent` afterwards.

### Automatic execution from the skill

The script is launched from `ui-contract-builder`, as the last step of **mode C (Contract → Figma)** and of **mode D** when a change is applied. No hook is needed: the skill is already the point everything drawn goes through.

- [ ] Move the script to `skills/ui-contract-builder/scripts/build-spec.mjs` (next to `check.mjs`) so it travels with the skill to other projects.
- [ ] In `references/contract-to-figma.md`, add at the end of the flow:
  1. `node <skill>/scripts/check.mjs <root>` (0 errors, otherwise stop).
  2. `node <skill>/scripts/build-spec.mjs <root> <Component>` → Markdown.
  3. Find the `SPEC_BLOCK` of the component's Section (`anchors.figma.spec`); if it does not exist, create it; if it exists, `editContent` by sections.
  4. Re-read with `getContent` and check that the contract version appears in the Spec.
- [ ] In `SKILL.md`, "When finished": one line pointing to that step.
- Discarded for now: a Claude Code hook after `use_figma`. It would fire on every write, not only when a component is finished. To be considered if the skill falls short.
- Optional, later: the ```tsx block as a Code Layer in the "Examples" Section (it is enabled in the file).
- [ ] **Two-way link (minimal version):** the Spec links to the contract on GitHub and the contract stores the Spec's node in `anchors.figma.spec`. If the schema does not accept that field, it goes to `meta` (do not touch the schema without asking).
- [ ] Plan B if there are no Specs: the same Markdown in a text frame inside the Section, marked as "generated".

## Phase 3 · Tokens and icons as resources

It already exists in `tokens/tokens.json`: primitives (`colors`, `spacing`, `radius`…) and a semantic layer (`tokens.colors`, `tokens.space`) that points to them. There is no need to invent the model.

- [ ] Dump two collections into SDD Library: `Primitives` and `Semantic` (aliases to primitives, Light/Dark modes). Components only use `Semantic`.
- [ ] Icons: **Phosphor** (decided). Bring the community library into the `Icons` page and link it. Rules in `contracts/PhosphorIconLibrary.contract.json`.
- [ ] `Icon.contract.json` is written for Lucide only: adapt it to Phosphor (major `version` bump if the API changes). It does not block Divider, which has no icons.
- [ ] Publish SDD Library as the team library (a manual step for the user in Figma).

## Phase 4 · Test with one component

- [ ] **Divider** (decided). Today it is a teaching example with no `anchors.figma`: it is drawn for the first time in SDD Library, `anchors.figma.file/node` are filled in and its `needsReview` warning is removed. Contract → Section → Spec → `check.mjs`.
- [ ] If it goes well, Button. No Checkbox (216 variants) in this phase.

## Phase 5 · Delivery

- [ ] Commits on this branch (contract first, then script and docs).
- [ ] Push to the fork `i-casaca/SD-Design-System` → only with OK.
- [ ] PR to `mokkapp-studio/SD-Design-System` → only with OK and as a separate step.

## Page and Spec model (2026-11-09, ticket "Spec template")

Replaces the Phase 1 scheme and the Phase 2 list (which remain as history).

**Component page in SDD Library** (one Section per component, width = column + Spec):

```
Section "<Component>"
├─ _sdd-header      dark (#1C2024), full width of the Section: eyebrow, title, description, version, contract link
├─ column-bg        gray background, on the left, as tall as the Section
├─ component        the COMPONENT_SET (white on the gray)
├─ examples         examples (white on the gray)
└─ Documentation    SPEC_BLOCK to the right of the column (x = column width + 60, y = below the header)
```

- When the Spec has been generated, the **Section height is restored** = max(Spec, column) + 80 and the header is widened to the Section width. The Spec's "full size" button has no API: it is done by hand in the UI.
- The documentation's **building blocks** (`_anatomy`, `_specs`, only the drawings that are exported as images) live separately, on the "Helpers" page, in a "Building blocks · <Component>" Section. No loose sheets inside the component's Section.

**"Documentation" Spec** (a single document; headers in English, content in English by default (or in the contract's language if it differs); a block with no data is omitted):

```
# Documentation
## Overview            Definition · Usage Guidelines (+ Label) · Behavior and Interactions
## Anatomy             Component Breakdown · Specs · Properties (+ #### Code) · Tokens · Breakpoints · Motion
## Accessibility       includes the measured contrast of the drawn variant
## History             git log
```

- **Only the drawings are images**: anatomy with markers (dark background, magenta) and Specs measurements (blue, green padding bands and orange spacing bands). **All data is Markdown** (GFM tables): parts with value, token and alias chain; Layout and spacing; tokens per size; All properties; Tokens with `var(--…)`. This way a machine can read it.
- The data is **extracted from the component in Figma** (bound variables, resolved aliases, text styles), not from the contract's numbers. Values with no token are marked "no token".
- `#### Code` inside Properties: condensed contract (props + `base` + `bySize`; Divider in full) and `tsx` usage, plus a link to the full contract.
- Style reference: Dynamic Handoff (data) and Hovercard (measurements drawing). Dynamic Handoff is used only for comparison; its output is not left in the file.

## Decisions (2026-11-08)

1. Icons: **Phosphor**.
2. Specs and Code Layer **enabled** in the file's plan → native Spec; plan B stays only as a fallback.
3. First component: **Divider**.
4. ```json block: **reference version** (props + tokens).
5. `build-spec.mjs` runs **from the skill** when drawing is finished (mode C/D), with no hook.
6. Component page: full-width dark header, gray column with component and examples, Spec on the right; Section height restored at the end; building blocks separate in "Helpers".
7. Spec: drawings as images, all data as Markdown; adds "Tokens" to the #20 skeleton.
