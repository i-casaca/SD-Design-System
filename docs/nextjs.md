# Bringing it to Next.js

Goal: start from an **empty** Next.js project and build the components from the contracts and tokens, leaving the contract as documentation next to each component.

## Next.js project structure

```
my-project/
├── AGENTS.md                       ← copy from this repo (rules) + project structure
├── design-system/                  ← copy of this repo (tokens/ and contracts/)
│   ├── tokens/tokens.css
│   └── contracts/
├── src/
│   ├── app/
│   │   └── globals.css             ← @import of design-system/tokens/tokens.css
│   └── components/
│       └── button/
│           ├── button.tsx          ← the component
│           ├── button.module.css   ← styles (only CSS variables from the tokens)
│           ├── button.contract.json← copy of the contract: rules for agents
│           └── button.md           ← readable documentation, generated from the contract
```

Having the contract next to the component lets an agent that opens the `button/` folder see the rules without looking elsewhere.

## How to bring the repo in (from simplest to most stable)

1. **Copy** the `tokens/` and `contracts/` folders into `design-system/`. Enough for the exercises.
2. **Git submodule** when you want to update from the system repo: `git submodule add <url> design-system`.
3. Later, a published package. Not needed now.

## The Next.js project's AGENTS.md

Minimum: copy this repo's `AGENTS.md` and add:

```md
## This project
- Contracts in `design-system/contracts/`, tokens in `design-system/tokens/tokens.json`.
- Each component lives in `src/components/<name>/` with `.tsx`, `.module.css` and its copied contract.
- Styles use only CSS variables defined in `src/app/globals.css`.
- Before coding anything non-trivial: plan mode, and wait for my approval.
```

## Workflow with the agent (Claude Code)

1. **Tokens → CSS.** In plan mode: "Read `design-system/tokens/tokens.json` and propose how to generate CSS variables in `globals.css`. Do not write code yet." Review the plan, approve.
2. **Contract → component.** "Read `design-system/contracts/Button.contract.json` and create `src/components/button/` with `button.tsx` and `button.module.css`. Comply with `AGENTS.md`. At the end, list the contract rules you applied."
3. **Document.** "Generate `button.md` from `button.contract.json`, without inventing anything that is not in the contract."
4. **Verify.** Ask for a test page with all variants and sizes and compare it with Figma. Then: "Review the component against the contract and list violations."
5. **Next component.** Contract first (in the system repo), then the copy in Next.js, then the code.

## If the component needs to change

Change the contract first in the system repo (and its `version`), copy the new version, and ask the agent to adjust the code. Never the other way around.

## Tokens and dark mode

```css
/* src/app/globals.css */
@import '../../design-system/tokens/tokens.css';
```

Put `data-theme="light"` or `"dark"` on `<html>` (or the `.dark` class). Components use only `var(--colors-accent-accent-9)` and the like: the mode changes the primitives and the rest follows.
