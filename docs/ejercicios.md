# Exercises — Section 2

Each exercise produces something that stays in the repo. Do them in order.

## Exercise 1 — Read a contract (20 min)

Open `contracts/Button.contract.json` next to a button from your Figma.
- Mark with colors which fields you can deduce by looking at Figma and which you cannot.
- List 3 `donts` you would add to `guidance`.
- Open `TextField.contract.json` and locate its slots: what is the difference with an icon in Button?
- **Deliverable:** a note with the "not in Figma" fields (expected: `description`, `guidance`, `a11y`, `events`).

## Exercise 2 — Prepare your component in Figma (45 min)

Pick **one** simple component from your system (button, badge, input).
- Variables named by usage, not by appearance.
- Auto layout, properties and layers with stable names.
- Component description.
- **Deliverable:** a screenshot of the properties panel and of the list of variables it uses.

## Exercise 3 — Tokens (30 min)

Find in `tokens/tokens.json` the variables that component uses and note them down. If you work with your own Figma, add or replace yours following `docs/tokens-from-figma.md`.
- **Deliverable:** the list of the component's token paths (for example `colors.accent.accent.9`) and, if you use your Figma, your `tokens.json` with real values.

## Exercise 4 — Your first contract, by hand (60 min)

Copy `_template.contract.json` and fill it in using `docs/contract-guide.md`; delete the optional blocks that do not apply.
- Run `node check.mjs` until there are no errors.
- **Deliverable:** `contracts/<Component>.contract.json` with no `<...>` placeholders (except anchors), with `check` green.

## Exercise 5 — From contract to code (60 min)

In an empty Next.js project, follow `docs/nextjs.md`: tokens → CSS, contract → component, in plan mode.
- **Deliverable:** `components/<name>/` with `.tsx`, `.module.css` and the copied contract, plus the list of rules the agent says it applied.

## Exercise 6 — Audit and documentation (45 min)

Ask the agent: "Compare the component with its contract and list violations". Verify 2 of them by hand. Then ask for `<component>.md` generated from the contract (prompt in `docs/contract-guide.md`, section 8).
- **Deliverable:** a list of violations, what you fix (the code or the contract?) and the `.md` next to the component.

## Exercise 7 — A container with slots (60 min)

Repeat 2–4 with a component that has gaps (Panel, Modal, Navbar). Model each gap as a `slot` with `allowedComponents`, `minItems`, `maxItems` and `figmaProp`.
- **Deliverable:** a contract with slots and a comparison against Figma (`docs/figma.md`, section 5).

## Afterwards

Repeat with a form component and a layer component (`form` and `overlay` blocks). When the manual work becomes repetitive, you are ready for the skill that automates it.
