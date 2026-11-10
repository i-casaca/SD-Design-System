# Design ↔ code parity

"Exactly the same" has three levels. The first two are checked by script; the third is reviewed.

## Level 1 — Contract ↔ code (automatic)

`scripts/conformance.mjs`. Guarantees that the code says the same as the contract: props, parts, states, ARIA attributes, allowed tokens, absence of loose values and of opacity on disabled, identical copy of the contract. Always run.

## Level 2 — Tokens ↔ final values (automatic, optional)

The contract fixes *which token goes where*; `tokens.css` fixes its value. If both are Figma's, the values match. To check it in the browser, with the playground open:

1. For each combination (variant × color × size × state) read the element's `getComputedStyle` (`background-color`, `color`, `border-color`, `box-shadow`, `height`, `border-radius`).
2. Compare with the value resulting from resolving the contract's token in `tokens.css` (light and dark mode).
3. Differences are CSS bugs (specificity, order, wrong property).

There is no script for this yet. It can be done with Playwright; ask for it if you want it as `scripts/computed-audit.mjs`.

## Level 3 — Render ↔ Figma (visual review)

What can differ even if the contract is met, and what to do:

| Possible difference | Why | What to do |
| --- | --- | --- |
| Font (SF Pro in Figma, another in the browser) | Figma uses the file's font; code uses `typography.font-family` | Install the same font or accept the difference and note it |
| Focus ring | The geometry is in `needsReview` | Compare with Figma and fix it in the contract |
| `classic` gradients | Layers without a variable in Figma | See `needsReview`; they cannot be generated from tokens |
| Hover/active opacity | Fixed in Figma, contract values | Same; check they are applied |
| Spinner | No contract of its own | Use the real component when it exists |
| Anti-aliasing, subpixels | Render engine | 1 px tolerance |

**Procedure:**

1. In Figma, `get_screenshot` of the node `anchors.figma.node` (or of specific variants).
2. In the browser, capture the playground of the same component, same state and size.
3. Compare in pairs: same size in px, same colors, same radius, same text weight.
4. Each real difference: is it the code's (fix it), the contract's (change it first) or Figma's (note it in `meta.needsReview`)?

## When to do what

| Situation | Level |
| --- | --- |
| Always | 1 |
| Component with many variants (Button, IconButton, Link) or before publishing the system | 1 and 2 |
| Critical component, new in production or after changing tokens | 1, 2 and 3 |

## To keep parity over time

- The contract is the only place where intent changes: **contract first**, new version, then code.
- The contract copy next to the component and the `@contract` comment make it possible to detect outdated code: the verifier fails if they do not match the original.
- Run the verifier in CI for all components:
  `for d in src/components/*/; do node design-system/skills/contract-to-component/scripts/conformance.mjs "$d" --ds design-system || exit 1; done`
