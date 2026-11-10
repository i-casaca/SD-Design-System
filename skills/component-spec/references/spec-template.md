# Spec template

Headers in English; content in the contract's language (English by default). A block with no data in the contract is omitted.

```
# Documentation
## Overview        Definition · Usage Guidelines (+ Label) · Behavior and Interactions
## Anatomy         Component Breakdown · Specs · Properties (+ #### Code) · Tokens · Breakpoints · Motion
## Accessibility   includes the measured contrast of the drawn variant
## History         git log of the contract
```

## Where each block comes from

| Block | Contract | Figma (`figma.json`) |
| --- | --- | --- |
| Definition | `description` | — |
| Usage Guidelines | `guidance.dos`, `donts`, `related`; `content.label` | — |
| Behavior and Interactions | `states`, `events`, `behavior.loading`, `behavior.overflow` | — |
| Component Breakdown | `anatomy` (+ anatomy image) | fill, stroke, radius and text style per layer, with their alias chain |
| Specs | `layout` (+ measurements image) | measured padding, gap and size |
| Properties | `props` | — |
| Code | `props` + `tokens.bindings` (condensed JSON) and a usage `tsx`; link to the full contract | — |
| Tokens | `tokens.bindings` with `var(--…)` | — |
| Breakpoints, Motion | `behavior.responsive`, `behavior.motion` | — |
| Accessibility | `a11y` | measured contrast (step 5) |
| History | `git log` of `contracts/<Component>.contract.json` | — |

## Data rules

- The link to the contract is a **GitHub permalink** (remote + SHA), never a local path. Without a GitHub remote, the script leaves a comment to add it by hand.
- A Figma value without a variable is written `value · no token`; it is not replaced by an assumed token.
- "Code" carries the condensed JSON (props, and `tokens.bindings` if they fit in 6 KB). The whole contract stays behind the link.

## Images

- Anatomy: dark background, numbered magenta markers matching the `#` column of Component Breakdown.
- Specs: blue measurements (width/height), green band = padding, orange band = space between parts.
- They are exported with `exportAsync({ format: 'PNG', constraint: { type: 'SCALE', value: 2 } })` and included as `![alt](data:image/png;base64,…)`. It is a snapshot: it is regenerated with the Spec.
- The drawings live in a "Building blocks · <Component>" Section of the utilities page (`HELPERS_PAGE` parameter of the scripts), outside the component's Section.

## Publishing

- First time: `figma.spec.createOnCanvasAsync({ title, content })`; returns `{ specNodeId }`.
- Regenerate: `figma.spec.setContent({ specNodeId, content })` with the whole Spec. `editContent` is only for targeted changes (each `oldText` must match exactly once).
- If `setContent` fails with "ambiguous table column correspondence" (the new tables have different columns from the current ones), empty it first: `setContent({ specNodeId, content: '# Documentation\n' })` and write the full Spec in a second call.
- Export the PNGs and encode them (`figma.base64Encode`) inside the same script that writes the Spec; the base64 must not pass through your context.
- Re-read: `figma.spec.getContent({ specNodeId })` → `.markdown`. It returns images as URLs (`…/image/<sha>?w=&h=`) and tables normalized (`|---|`); `--verify` accepts that.
- Height of the component's Section = max(Spec, column) + 80.
- The Spec's "full size" button has no API: press it by hand in the UI.
