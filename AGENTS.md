# AGENTS.md

Rules for any AI agent working with this design system.

## Before creating or modifying a component

1. Read `contracts/<Component>.contract.json`. If it does not exist, **do not invent it**: ask for it, or create it from `contracts/_template.contract.json` and wait for confirmation.
2. Read the tokens in `tokens/` (the source is `tokens/tokens.json`; in code, the CSS variables in `tokens/tokens.css`, which is generated from it).
3. Check `docs/components.md` for the props vocabulary and related components.

## Rules

- **`description` and `guidance.donts`:** if the request falls under a don't, warn and suggest the `useInstead` component.
- **Props:** names, types and default values exactly as in `props`. Do not add props that are not there.
- **States:** `states.native` are resolved with CSS (`:hover`, `:focus-visible`, `:active`). `states.controlled` are props and carry the indicated `aria` attribute.
- **Anatomy:** each key in `anatomy` is a part; give it `data-part="<key>"`. The `ref` goes on `semantics.refTarget`.
- **Slots:** respect `slot.allowedComponents`, `minItems`, `maxItems` and `mandatory`. A slot is a prop or `children`, depending on the contract.
- **Composition:** never put inside anything listed in `composition.forbiddenChildren`.
- **Tokens:** use only what is defined in `tokens.bindings`, and only categories from `tokens.policy.allowed`. Nothing from `tokens.policy.forbidden`, and no hex colors or loose px values.
- **Modes:** never write different values for dark; use the CSS variable and the mode changes on its own (`[data-theme="dark"]`).
- **Generated tokens:** do not edit `tokens.css`; change the JSON and run `npm run tokens:build`.
- **Disabled:** with the `*.disabled` tokens. Never with `opacity`.
- **Accessibility:** comply with `a11y` (name, keyboard, visible focus, minimum target size, contrast).
- **If something is not in the contract:** ask. Do not fill gaps with assumptions.

## When finished

1. Run `node check.mjs` if you touched contracts or tokens.
2. Reply with a short list: which contract rules you applied and what you left out or were unsure about.

## Changes

If the component has to change, change the **contract first** (and its `version`), then the code.
