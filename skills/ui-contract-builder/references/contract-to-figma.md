# Contract → Figma (mode C)

Generates or completes the component in Figma from the contract. This is the most delicate mode: it writes to the user's file.

## Before starting

1. Load the `figma-use` skill (mandatory before `use_figma`) and, to create a library, `figma-generate-library`.
2. Confirm with the user **in which file and on which page** to create it. Do not create in a file you were not told about.
3. Check that the file has what the contract cites:
   - the **variables** in `tokens.bindings` (search by name; in a remote library, import them);
   - the **components** in `composition.nestedComponents` and `slot.allowedComponents`.
   If anything is missing, **stop and say so**: never replace it with loose values or rectangles.
4. Use `search_design_system` to find existing components and variables and reuse them.

## What is created

- A `COMPONENT_SET` named `name` with properties from `props[].bindings.figma` (same name, type and `value`).
- Layers named after `anatomy[*].figmaLayer`, with auto layout per `layout.autoLayout`.
- Slots and instance swap per `anatomy.<part>.slot.figmaProp`.
- Every fill, stroke, shadow, radius and text **bound to the variable** or style from the contract. If the contract has no token for something, do not paint it: ask.
- Variants for each combination of VARIANT-type `props`; ✦ on the default value if the file uses it.

## When done

1. Read the component back with mode D (compare) and list differences against the contract.
2. Check that there are no values without a variable.
3. Update the contract: `anchors.figma.node` with the new node and `meta.needsReview` with what is unresolved.
4. **Spec:** invoke the `component-spec` skill (valid contract with `check.mjs` → Figma data → drawings → Spec → re-read with `getContent`). It is the last step of mode C and of mode D when a change is applied.
5. Ask for visual review: composition and fine polish are done by the user.
