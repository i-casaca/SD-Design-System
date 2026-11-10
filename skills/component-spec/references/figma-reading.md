# Reading Figma for the Spec

Read-only except for the `draw-*` scripts. Before reading, confirm the file (name and key) with the user.

- The output of `use_figma` / `figma_execute` is cut off around 20 KB. `extract-variables.js` measures **one variant** (`VARIANT` filters by name); for another, run it again with different text.
- Paste the script with the parameters already edited; do not split it: use top-level `return` and `await`.
- Variables: resolved by id, following aliases to the final value of the first mode of each collection (`token` → `via` → `value`). `token: null` = value without a variable.
- `fills: []` on the set root is normal: the color is usually on a child layer.
- Instances (icons) are not traversed; measure their container layer.
- Text and effect styles are read by name (`text.style`, `effectStyle`).
- A Figma default value may carry ✦ in its name; the contract stores the value without the mark.
- `--compare` matches Figma tokens with the contract's: a `{…}` placeholder matches any segment, so it can let a wrong token through. When in doubt, look at the layer.
