# Tokens from Figma (Radix Themes)

`tokens/tokens.json` is the repo's **only token source**: it contains all the variables and styles of the Figma file *Radix Themes (Community)*, with their modes. It is what the contracts, scripts and agents read.

```
Figma (variables + styles)  →  tokens/tokens.json  →  scripts/build-tokens.mjs  →  tokens/tokens.css
        origin                 source of truth       (npm run tokens:build)        what Next.js imports
```

`tokens.css` is always generated from `tokens.json`: it is not edited by hand.

## What it contains

A single file with these top-level groups:

| Groups | Origin in Figma | Modes | Count |
| --- | --- | --- | --- |
| `variables`, `colors` (scales), `overlays` | "Color scheme" collection (primitives: scales 1–12, alpha, overlays) | **Light** and **Dark** | 798 |
| `colors` (accent, neutral…), `typography`, `spacing`, `radius`, `panel`, `tokens` | "Theme ✦" collection (semantic) | 1 (`Theme A`) | 226 |
| `radius-scale`, `scaling` | "Radius" and "Scaling" collections (`scaling.90…110.*`) | 1 | 105 |
| `shadows` | Effect styles | n/a | 12 |
| `text-style` | Text styles (`text-style.1.regular`…) | n/a | 36 |

The generated CSS (`tokens.css`) has 1141 variables in Light and redefines 748 in Dark.

## How modes are represented

- `$value` is the value of the **Light** mode. `$extensions.modes` stores `{ light, dark }` on the color primitives.
- Aliases are written as `{token.path}`. Components use the **Theme** layer, which points to primitives; this way, switching mode changes the primitives and everything else follows.
- In CSS: Light is the default value (`:root, [data-theme="light"]`) and Dark only redefines what changes (`[data-theme="dark"], .dark`): 748 of 798 colors.
- `$extensions["com.figma"].scopes` keeps where Figma allows each variable to be applied (`GAP`, `WIDTH_HEIGHT`…).

## Names

Figma path → lowercase, spaces to hyphens, `%` removed. `Colors/Accent/accent 9` becomes `colors.accent.accent-9` and `--colors-accent-accent-9` in CSS. `Radius` and `Scaling` carry a prefix (`radius-scale`, `scaling`) so they do not clash with the theme's `radius.*`.

## Shadows and text styles

- Shadows: list of layers `{color, offsetX, offsetY, blur, spread, inset}` in **CSS order**. Figma stores them in reverse order and the export corrects it.
- Text: each style references the theme's `typography.*` variables. In CSS they come out as `--text-style-1-regular: 300 12px/16px Inter` and `…-letter-spacing`.

## How to re-export

1. In Figma, read the variables with the Plugin API (`figma.variables.getLocalVariableCollectionsAsync()`) and the styles with `getLocalTextStylesAsync()`, `getLocalEffectStylesAsync()`.
2. Store each variable with its value per mode and, if it is an alias, the name of the target variable.
3. Reapply the naming rules above and rewrite `tokens/tokens.json` (everything in a single file, with the groups in the table above).
4. `npm run tokens:build` and `npm run check`.

What matters: the **JSON is what gets versioned**; the CSS is always regenerated.

## Adding themes

The theme (`Theme ✦`) is designed to have more modes. Add a mode in Figma (e.g. "Theme B") and export: that value goes into the theme token's `$extensions.modes` and the build will emit a `[data-theme="b"]` block. Today the build only handles light/dark.

## Things to review

- **Light weight = 300** is an assumption: Figma stores it as the text "Light". It is marked on the token.
- **`scaling.95.9`** is called `95%/09` in Figma (typo); here it is `9`.
- **`text-style.9.light`** uses `letter-spacing/4` in Figma instead of `/9`. It is respected as is; confirm it.
- **Gradients and image styles** (paint styles) were not exported.
- **Radix does not separate primitives from semantics:** components use scales (`colors.neutral.neutral-alpha.3`) directly. That is why the AlertDialog contract's `policy` allows `colors` and `overlays` (scales) in addition to `panel`.

## Relation to the contracts

Each contract's `tokens.bindings` use these paths (`colors.accent.accent-9`, `spacing.4`, `shadows.shadow-6`). `npm run check` verifies that they exist and respect the `policy`.
