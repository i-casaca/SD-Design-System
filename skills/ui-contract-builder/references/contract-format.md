# Contract format

Source of truth for the format: `assets/component.schema.json`. Template: `assets/_template.contract.json`. Real examples: `assets/example.*`.

Principle: the contract stores **what neither Figma nor code can say on their own** (intent, limits, rules). What can be read from the source (`props.type`, `default`, measurements) is noted in `meta.derivableFromSource`.

## Blocks

**Core (always):** `id`, `name`, `version`, `status`, `description`, `guidance`, `semantics`, `props`, `states`, `anatomy`, `tokens`, `a11y`.

**Optional (those that apply):** `category`, `composition`, `layout`, `events`, `form`, `overlay`, `data`, `media`, `theming`, `i18n`, `content`, `behavior`, `testing`, `governance`, `anchors`, `meta`. Add your own blocks inside the free objects (`composition`, `layout`, `behavior`, `meta`) without touching the schema.

| Component type | Also add |
| --- | --- |
| Action (Button, IconButton) | `events`, `layout`, `behavior` (loading), `content` |
| Link / navigation (Link, Tabs, Breadcrumb) | `composition`, `a11y.keyboard`, `behavior` |
| Container (Panel, Modal) | `composition` + slots, `layout` |
| Field (Input, Checkbox, Select) | `form`, `events` |
| Layer (Dialog, Popover, Menu) | `overlay`, `events` |
| Data (Table, List) | `data` |
| Media (Avatar, Image) | `media` |

## What goes in each block

- **id / name / version / status**: `id` in kebab-case, `name` in PascalCase (the file is `<name>.contract.json`). Semver version (`1.2.3`); `status`: `draft` | `beta` | `stable` | `deprecated`; `category`: `action` | `input` | `container` | `overlay` | `data` | `media` | `navigation` | `feedback`.
- **description**: 1–2 sentences, intended use. A product decision, not taken from Figma.
- **guidance**: `dos` (2–5 sentences), `donts` (`case`, `useInstead`, `why`; minimum 2), `related` (`component`, `relation`: `alternative` | `similar` | `contains` | `contained-by`, `difference`).
- **semantics**: `element` (HTML), `role`, `refTarget` (`anatomy` key that receives the `ref`), `elementByProp`.
- **props**: `name`, `type` (TypeScript), `default` or `required`, `description`, `usage` (optional), `bindings.figma` (`property`, `type`, `value`) or `null` if code-only.
- **states**: `native` (resolved with CSS: hover, focus-visible, active) and `controlled` (they are props: `disabled`, `loading`, with their `aria` attribute).
- **anatomy**: object of parts. Each part: `element`, `description`, `optional`, `figmaLayer`, `figmaToggle`, and `slot` (`key`, `allowedComponents`, `minItems`, `maxItems`, `mandatory`, `figmaProp`) or `content` (`prop`).
- **tokens**: `policy` (`allowed`, `forbidden`), `scales` (optional) and `bindings`.
- **a11y**: `role`, `name`, `keyboard[]`, `focusIndicator`, `minTarget`, `contrastNote`, `wcag[]`.
- **anchors**: `figma.file`, `figma.node` (with `:`), `code.importPath`, `code.export`.
- **meta**: `source`, `derivableFromSource[]`, `needsReview[]`.

## Figma ↔ code binding (`bindings.figma`)

- `property` identical to Figma's (capitalization, emojis and typos included; omit the `#id` suffix of non-variant properties).
- `type`: `VARIANT` | `BOOLEAN` | `TEXT` | `INSTANCE_SWAP` | `SLOT`.
- **Boolean in code, variant value in Figma**: use `value` with the Figma value equivalent to `true` (`disabled` ↔ `state=disable`, `loading` ↔ `loading=true`). Several props can share an axis if their `value` differs.
- Parts shown/hidden with a boolean that is not a code prop (focus, backdrop): `anatomy.<part>.figmaToggle`.
- Figma default values with ✦ (`solid ✦`): the contract has the value without the mark. If Figma's default does not match the intent, use the intent and note it in `needsReview`.

## Tokens

- Token name = Figma path in lowercase, spaces → `-`, `%` dropped, separated by dots: `Colors/Accent/Accent Alpha/11` → `colors.accent.accent-alpha.11`. CSS variable: `--colors-accent-accent-alpha-11`.
- `tokens.policy.allowed` lists **categories** (first segment of the path: `colors`, `spacing`, `radius`, `text-style`, `shadows`…). A category the check does not find in `allowed` is an error.
- Placeholders: `{size}` expands with the values of that prop's enum; `{color.step}` takes `tokens.scales.<color value>.step`. `null` in `scales` = does not exist for that value.
- `bindings` structure: `base` (does not change), `bySize`, `byVariant.<variant>.<state>`, `byHighContrast` (only what changes), `byState.disabled`.
- Loose numeric values (border width, opacity, widths) are accepted as numbers, not strings. **Never use opacity for disabled**; use neutral tokens.
- If Figma has a value without a variable (hover opacity, gradients), do not invent it: `needsReview`.

## Quality conventions

- `donts`: each with a real alternative (`useInstead`) and a reason. If the target has no contract, the check emits a warning: that is fine.
- `a11y.name` says where the accessible name comes from. Icon-only components: `aria-label` is mandatory and has its own prop.
- Touch target: note if there are targets < 24 px (WCAG 2.5.8), with the exception of inline links.
- Props vocabulary: follow the project's `docs/components.md` (`variant`, `size`, `color`, `highContrast`, `disabled`, `loading`). Never two names for the same thing.
- Versioning: patch = text; minor = new prop or state; major = rename or remove. The contract change comes before the code change.
