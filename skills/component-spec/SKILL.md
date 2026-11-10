---
name: component-spec
description: Generates the Spec ("Documentation") of a component already drawn in Figma from its JSON contract, and publishes it as a native Figma Spec. Use it after drawing or changing a component, or when asked to "generate/update the Spec of <Component>". It does not draw the component.
---

# component-spec

Input: `contracts/<Component>.contract.json` + the component already drawn in Figma. Output: a Spec document on the component's page. The Spec is **generated**; manual edits are lost on the next run.

The **data** (props tables, tokens, measurements) is Markdown, so a machine can read it. Only the **drawings** (anatomy, measurements) are images.

## Before starting

- The **system root** is the folder with `contracts/component.schema.json` and `check.mjs`. Without them, stop and say so.
- Confirm the Figma file (name and key) and the component node with the user before reading or writing. If the component is not drawn, stop: this skill does not create it.
- Load the `figma-use` skill before every `use_figma`.
- Do not change the schema or the contract content. Every mismatch is reported, never fixed here.

## Steps

Each step ends when its criterion is met; do not move on before that.

1. **Valid contract.** `node <root>/check.mjs <root>` → **0 errors**. With errors, stop and report them.
2. **Figma data.** Run `scripts/figma/extract-variables.js` (read-only; edit `NODE_ID`) and save the output as `figma.json`. Criterion: the JSON has `layers` and every color/measurement is a variable (`token`) or is marked "no token". Read `references/figma-reading.md` if the output is cut off or a layer is missing.
3. **Mismatch warnings.** `node scripts/build-spec.mjs <root> <Component> --compare figma.json`. Criterion: every warning reported to the user with its layer or property. Change nothing in the contract or Figma.
4. **Drawings.** Run `scripts/figma/draw-anatomy.js` and `scripts/figma/draw-specs.js` (they write to the building blocks page; edit their parameters with `anatomy.<part>.figmaLayer`). Export each sheet with `exportAsync` (PNG, 2x). Criterion: one anatomy image with all parts numbered and one measurements image; check both with a screenshot.
5. **Markdown.** `node scripts/build-spec.mjs <root> <Component> --figma figma.json > spec.md`. Replace `<!-- image:anatomy -->` and `<!-- image:specs -->` with `![alt](data:image/png;base64,…)` and fill in or delete `<!-- contrast: -->` with the measured contrast of the drawn variant. Criterion: no `<!-- … -->` marker left in the text.
6. **Publish.** Find the component's SPEC_BLOCK (contract `meta`/`anchors.figma.spec` or the component's Section). If it does not exist, `figma.spec.createOnCanvasAsync`; if it exists, `figma.spec.setContent` with the whole Spec (if it fails because of tables, see the trick in `references/spec-template.md`). Page structure and API limits in `references/spec-template.md`.
7. **Verify.** Re-read with `getContent`, save the text as `reread.md` and run `node scripts/build-spec.mjs <root> <Component> --verify reread.md`. Criterion: output `✓`. With `✗`, fix and repeat from step 5.

## When done

Report in 5–8 lines: published contract version, all warnings from step 3, which drawings were made, "no token" values, and what you could not check. Declare "verified" only what was re-read.

## References (read them when needed)

- `references/spec-template.md` — Spec skeleton, where each block comes from in the contract, page and Section in Figma.
- `references/figma-reading.md` — reading Figma in chunks, output limits, quirks.
