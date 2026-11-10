# Installing the skill in a project

The instructions apply equally to the sibling skill `contract-to-component` (implements the component in tsx from the contract). Install both: the first creates the contract; the second turns it into code.

The skill is a folder (`ui-contract-builder/`). It is activated when Claude Code finds it in one of these places:

| Where | Scope |
| --- | --- |
| `~/.claude/skills/ui-contract-builder/` | All your projects (personal) |
| `<project>/.claude/skills/ui-contract-builder/` | Only that project (versioned with it) |

## Minimal and recommended structure

Minimal (works): `SKILL.md` with `name` and `description`.

Recommended:

```text
ui-contract-builder/
├── SKILL.md                      procedure and rules (short)
├── references/                   read only when needed
├── assets/                       schema, template and examples
└── scripts/check.mjs             dependency-free validator
```

## Option 1 — Personal skill (the simplest)

```bash
mkdir -p ~/.claude/skills
cp -R design-system/skills/ui-contract-builder ~/.claude/skills/
```

Works in any project. To update, copy again.

## Option 2 — Inside the design system repo

Leave the folder at `design-system/skills/ui-contract-builder/` (it already is). Whoever works in that repo has it. For Claude Code to detect it in that repo, link it:

```bash
mkdir -p .claude/skills
ln -s ../../skills/ui-contract-builder .claude/skills/ui-contract-builder
```

## Option 3 — In a Next.js project that uses the system as a submodule

```bash
# from the Next.js project root
mkdir -p .claude/skills
ln -s ../../design-system/skills/ui-contract-builder .claude/skills/ui-contract-builder
git add .claude/skills
```

This way the skill is updated when you update the submodule. When creating contracts from the Next.js project:

- They are written to `design-system/contracts/` (the submodule), **not** to `src/`.
- You must commit and push **inside the submodule** and then bump the pointer in the project (`git add design-system && git commit`).
- It is better to open a Claude Code session in the design system repo to create contracts, and use the Next.js project only to consume them.

## Requirements

- **Node 18+** for `scripts/check.mjs`.
- **Figma MCP** connected in Claude Code (for modes A, C and D). Check with `/mcp` that it appears and that you are signed in. Server installation is in the Figma documentation ("Figma MCP server").
- The Figma file open or accessible with your account.

## Check that it works

1. Open Claude Code in the project (new session, so it loads the skills) and ask "which skills do you have available?": `ui-contract-builder` must appear.
2. Try: "With ui-contract-builder, check the contracts in design-system/". It must run `check.mjs` and give you the summary.
3. First real use: "Create the contract for this component: <Figma link>".

## If you don't use Claude Code

The skill only exists as a folder for Claude Code. In claude.ai you can save `SKILL.md` as an account skill, but without the `references/`, `assets/` and `scripts/` folders: use the repo version instead.
