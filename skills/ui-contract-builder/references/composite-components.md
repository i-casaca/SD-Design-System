# Composite components (Navbar, Tabs, Table, Menu…)

A composite component is built from other components in the system. Rule: **one contract per component that is used on its own**; internal pieces that exist only inside it are described in its contract.

## When it is one contract and when several

| Situation | What to do |
| --- | --- |
| The piece is also used outside (Button, IconButton, Link) | Its own contract. The composite cites it in `composition.nestedComponents` or `slot.allowedComponents` |
| The piece exists only inside (NavbarItem, TabsTrigger) | Part in the composite's `anatomy`; if it has its own props, `composition.codeParts` |
| Several pieces with a compound API in code (Root, List, Item…) | A single contract; `composition.codeParts` describes each part |

## Steps

1. **Dependency inventory.** List the components it needs and check which have a contract (`contracts/`). For the ones that are missing, warn before continuing: propose creating them first or leaving them as an open `slot.allowedComponents`.
2. **Slots.** Each free zone is a slot in `anatomy.<zone>.slot` with `allowedComponents`, `minItems`, `maxItems`, `mandatory`. Example (Navbar): `brand` (1, mandatory), `nav` (1–7 Link), `actions` (0–3 Button/IconButton).
3. **Composition rules.** `composition.allowedChildren` / `forbiddenChildren`: what fits and what never does (e.g. a Navbar does not contain another Navbar; the `actions` slot does not admit more than one Button with solid/classic variant).
4. **Responsive.** In `behavior.responsive`: list of `{ breakpoint, change }`. Each change must be concrete: "below 768 px `nav` becomes a dropdown menu opened by an IconButton with aria-label “Open menu”". Breakpoints must exist as a token if the system defines them; otherwise, loose value + `needsReview`.
5. **Own states.** Open/closed, selected, active. Those that persist are `states.controlled` with their `aria` (`aria-expanded`, `aria-current="page"`).
6. **Keyboard and focus.** A composite almost always needs extensive `a11y.keyboard` (arrows, Escape, Tab) and focus order. Do not leave it blank.
7. **Semantics.** `semantics.element` of the container (`nav`, `ul`…) and `a11y.name` (landmark with `aria-label`).
8. **Tokens.** Only the container's own (background, border, spacing, heights). The internal pieces' tokens are already in their contracts: do not duplicate them.
9. **Layout.** Height, maximum widths, the container's auto layout, and how space is distributed between slots (`gap` per size).
10. **Two-way dependencies.** Add the composite to the pieces' `guidance.related` (relation `contained-by`) and the pieces to its own (`contains`).

## Skeleton example (Navbar)

```json
"anatomy": {
  "root":    { "element": "header", "description": "Bar container." },
  "brand":   { "element": "slot", "slot": { "key": "brand", "allowedComponents": ["Link"], "minItems": 1, "maxItems": 1, "mandatory": true } },
  "nav":     { "element": "slot", "slot": { "key": "nav", "allowedComponents": ["Link"], "minItems": 1, "maxItems": 7, "mandatory": true } },
  "actions": { "element": "slot", "optional": true, "slot": { "key": "actions", "allowedComponents": ["Button", "IconButton"], "minItems": 0, "maxItems": 3, "mandatory": false } },
  "menuToggle": { "element": "slot", "description": "Mobile only.", "slot": { "key": "menuToggle", "allowedComponents": ["IconButton"], "minItems": 1, "maxItems": 1, "mandatory": false } }
}
```

It is a shape skeleton, not a design: each decision (how many links, what collapses) comes from the mini-spec.
