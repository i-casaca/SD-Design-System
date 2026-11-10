# Prompts for working in Next.js

Templates for asking the agent (Claude Code) to build components and pages from the contracts. Replace what is between `<…>`.

General rules:
- **One task per session** (one component, one page). Short sessions perform better.
- **Plan first, code later** for new components: ask for the plan, read it, and then say "go ahead".
- **Explicit paths**: always name the contract and the folder.
- **One component per commit.**

---

## 0. Prepare the project (once)

```
Read AGENTS.md. Prepare the Next.js project to use the design system in design-system/:

1. In src/app/globals.css, import design-system/tokens/tokens.css at the top.
2. In src/app/layout.tsx, add data-theme="light" to the <html>.
3. Add these scripts to package.json:
   "ds:check": "node design-system/check.mjs"
   "ds:tokens": "node design-system/scripts/build-tokens.mjs"
4. Create src/components/ and src/app/playground/page.tsx (an empty page with the title "Playground").
5. Check that `npm run dev` starts and that `npm run ds:check` passes.

Do not create any component yet. Summarize what you changed.
```

## 1. Create a component (with a prior plan)

**Step A: plan**

```
Read AGENTS.md and design-system/contracts/<Component>.contract.json.
Do not write code yet. Give me a plan in this form:

- Component props (table: name, type, default).
- Anatomy parts and which HTML element each one uses.
- How you will implement the behavior (Radix primitive or custom code? does it need "use client"?).
- Which tokens you will use and how they become CSS variables.
- Which part of meta.needsReview affects you and what you will do about it.
- Doubts or decisions you need from me.
```

**Step B: build**

```
Go ahead with the plan, with these adjustments: <adjustments or "none">.

1. Create src/components/<name>/ with <name>.tsx and <name>.module.css.
2. Copy the contract to src/components/<name>/<name>.contract.json (without modifying it).
3. Add the component to the playground with all its variants, sizes and states.
4. Run `npm run build` and `npm run lint`. Fix whatever fails.

Finish with the summary from AGENTS.md.
```

## 1b. Create a component with the skill

```
With contract-to-component, create the <Component> component from design-system/contracts/<Component>.contract.json.
Follow AGENTS.md. If dependencies are missing or there are meta.needsReview points that affect the code, ask me first.
Finish with the verifier's result and the summary from AGENTS.md.
```

## 2. Review a component against its contract (read-only)

```
Review src/components/<name>/ against design-system/contracts/<Component>.contract.json.
Do not change anything. List, in separate tables:

- Props that are missing, extra or do not match in type or default.
- Anatomy parts without data-part, and refTarget.
- Contract tokens that are not used and CSS values that do not come from the contract (hex, loose px).
- States (native and controlled) not implemented and missing ARIA attributes.
- a11y violations (keyboard, focus, minimum target size, accessible name).
Mark each finding as error or warning.
```

## 3. Generate the documentation

```
Read src/components/<name>/<name>.contract.json and generate src/components/<name>/<name>.md with:
description, do's and don'ts, props table, states, anatomy (with slots), tokens and accessibility,
and a usage example in TSX.
Do not invent anything that is not in the contract. Include the meta.needsReview points as "Pending".
```

## 4. Compound component (RadioGroup, AlertDialog…)

```
Read AGENTS.md and design-system/contracts/<Component>.contract.json.
The contract is for a compound component: look at composition.codeParts and composition.item.
Before writing code, tell me:
- Which parts you will export (for example <Component>.Root and <Component>.Item).
- Which components that already exist in src/components/ you will reuse.
- Whether any component the contract needs (slot.allowedComponents) is missing and does not exist.
If any is missing, ask me before continuing.
```

## 5. Create a page or form

```
Create the page src/app/<route>/page.tsx: <description: e.g. a login form with email, password, "remember me" and a submit button>.

Rules:
- Use only components from src/components/. If you need one that does not exist, do not create it: tell me which one is missing.
- Layout with its own CSS Module (page.module.css) and tokens (var(--spacing-*)). No loose values.
- Each field with its label; the form with an aria-label or title.
- Server Component by default; "use client" only on the form if it has state.
Finish with the list of components used and the ones that are missing.
```

## 6. The contract changed

```
design-system/contracts/<Component>.contract.json has changed (version <x.y.z>).
1. Copy it again to src/components/<name>/<name>.contract.json.
2. Compare the new contract with the current code and tell me what has to change. Do not change code yet.
3. When I confirm, apply it, regenerate <name>.md and update the playground.
```

## 7. The tokens changed

```
I have updated design-system/ (tokens). Run `npm run ds:check`.
Search src/components/ for any token that no longer exists (--… variables that are not in tokens.css) and tell me which components break. Do not change anything until I confirm.
```

## 8. When the agent strays

| Symptom | What to tell it |
| --- | --- |
| Invents a prop or variant | "That prop is not in the contract. Remove it or ask me." |
| Uses a loose color or px | "Replace that value with the contract token (`tokens.bindings…`)." |
| Reimplements the keyboard by hand | "Use the Radix primitive for behavior (AGENTS.md)." |
| Opacity on disabled | "Disabled uses `byState.disabled`, never opacity." |
| Creates a component without a contract | "There is no contract. Stop and tell me what is missing." |

## 9. Icons

**Install (once):**

```
Read AGENTS.md and design-system/docs/icons.md. Install the Lucide icons:
1. npm install lucide-react
2. Add to package.json the script "ds:icons": "node design-system/scripts/build-icons.mjs src/components/icon/icons.ts" and run it.
3. Create src/components/icon/ with icon.tsx and icon.module.css from design-system/contracts/Icon.contract.json, and copy the contract.
4. Add to the playground a row with all the icons in design-system/icons/registry.json at sizes 14, 16, 18 and 20.
Do not modify other components yet. Summarize what you did.
```

**Connect a component with icons:**

```
Read design-system/contracts/<Component>.contract.json and src/components/icon/.
The component has icon slots (<icon, iconEnd…>). Make it so that:
- the icon size comes from the contract's layout.iconSize, via CSS according to size;
- the color is inherited (currentColor);
- the playground shows the component with and without an icon.
Do not import icons inside the component: it receives them as a node.
```

**Add an icon:**

```
I need the icon "<description>". Look it up at lucide.dev/icons, tell me the PascalCase name and propose the entry for design-system/icons/registry.json (name and use). Do not touch design-system/: give me only the entry.
```

## 10. Recommended component order

1. Icon (after installing Lucide).
2. Button and Link (Button uses Icon; Link has no dependencies).
3. IconButton (same tokens as Button; receives an Icon; requires `aria-label`).
4. Checkbox, Switch, RadioGroup (behavior with primitives).
5. TextField (uses IconButton as trailing button: do it after IconButton).
6. AlertDialog (uses Button).
7. Pages: login, settings, long form.
