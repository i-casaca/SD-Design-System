# Components

Index of components and shared vocabulary. If a component is not here, it does not exist yet.

## Index

| Component | Contract | Type | Status | When to use it | Related |
| --- | --- | --- | --- | --- | --- |
| Button | `contracts/Button.contract.json` | action (Radix Themes, v2) | draft | Trigger an action with a label | Link, Toggle, IconButton |
| Link | `contracts/Link.contract.json` | navigation (Radix Themes) | draft | Navigate to another page or resource | Button |
| IconButton | `contracts/IconButton.contract.json` | action (Radix Themes) | draft | Icon-only action; `aria-label` required | Button, Icon, TextField |
| AlertDialog | `contracts/AlertDialog.contract.json` | layer (Radix Themes) | draft | Confirm an action that interrupts | Dialog |
| TextField | `contracts/TextField.contract.json` | field (Radix Themes) | draft | Single-line text (uses IconButton as trailing button) | TextArea, Select, IconButton |
| TextArea | `contracts/TextArea.contract.json` | field (Radix Themes) | draft | Multi-line text with vertical scroll | TextField, Select |
| Checkbox | `contracts/Checkbox.contract.json` | field (Radix Themes) | draft | Independent option, with indeterminate state | CheckboxGroup, RadioGroup, Switch |
| RadioGroup | `contracts/RadioGroup.contract.json` | field (Radix Themes) | draft | Choose one option among a few | Checkbox, Select, Switch |
| Switch | `contracts/Switch.contract.json` | field (Radix Themes) | draft | Setting with immediate effect | Checkbox, RadioGroup, Button |
| Icon | `contracts/Icon.contract.json` | media (Lucide) | draft | Icon with consistent size and accessibility | Button, IconButton, TextField |
| Divider | `contracts/Divider.contract.json` | container (minimal example) | draft | Separate two groups of content; **the shortest contract, to start with** | — |
| PhosphorIconLibrary | `contracts/PhosphorIconLibrary.contract.json` | media (Phosphor) | draft | Alternative to IconLibrary with Phosphor: catalog, regular / fill weights, names and handoff to Figma. A project uses one library or the other (it is not a component) | IconLibrary, Icon, IconButton |
| Badge | `contracts/Badge.contract.json` | feedback | draft | Short non-interactive label with a status or category; 4 variants × 31 colors × 3 sizes | Button, Link, Icon |
| IconLibrary | `contracts/IconLibrary.contract.json` | media (Lucide) | draft | Icon library rules: full catalog, names, stroke and handoff to Figma (it is not a component) | Icon, IconButton |
| NavbarItem | `contracts/NavbarItem.contract.json` | navigation (Figma SD-Design-v2) | draft | Text item of a navigation bar; `active` marks the current section | Link, Button, IconButton |
| Navbar | `contracts/Navbar.contract.json` | navigation (Figma SD-Design-v2) | draft | Top bar with brand, sections and actions; on mobile, a dropdown panel | NavbarItem, Button, IconButton |
| FormField | `contracts/FormField.contract.json` | field (Figma SD-Design-v2) | draft | Label, TextField control and help or error text below | TextField, TextArea, Icon |
| Form | `contracts/Form.contract.json` | container (Figma SD-Design-v2) | draft | Complete form: header, FormField fields, privacy checkbox and button; error, submitting and success states | FormField, Checkbox, Button, Badge |
| FooterColumn | `contracts/FooterColumn.contract.json` | container (Figma SD-Design-v2) | draft | Footer column: group title and vertical list of Link links | Link, Navbar, NavbarItem |
| Footer | `contracts/Footer.contract.json` | container (Figma SD-Design-v2) | draft | Page footer: simple version (bottom bar) or full (brand, columns and divider); optional social networks | FooterColumn, IconButton, Divider, Navbar |
| _next_ | | | pending | | |

> One at a time: clean it up in Figma, write its contract, bring it to code and only then the next one.

## Props vocabulary

If two components call the same thing by different names, neither people nor AI get it right. Always use these names.

| Concept | Name | Values / type | Do not use |
| --- | --- | --- | --- |
| Visual emphasis | `variant` | per component | `kind`, `type`, `appearance` |
| Size | `size` | `'1'`…`'4'` (Radix) or `s`, `m`, `l` in custom systems | `small`, `large` |
| Color meaning | `color` | `accent`, `neutral`, `error` (Badge extends with `success`, `warning`, `info` and the Radix scales) | `intent`, `tone`, `danger` |
| Increased contrast | `highContrast` | boolean | `highConstrast` (axis typo in the Radix Figma) |
| Unavailable | `disabled` | boolean | `isDisabled`, `inactive` |
| Action in progress | `loading` | boolean | `isLoading`, `busy` |
| Leading / trailing icon | `icon` / `iconEnd` | node | `leftIcon`, `rightIcon` |
| Full width | `fullWidth` | boolean | `block`, `stretch` |
| Press | `onPress` | function | `onClick` |
| Main content | `children` | node | `text`, `title` |
| Named slots | `header`, `footer`… | node | `top`, `bottom`, `renderHeader` |
| Root element | `as` | string | `tag`, `component` |

Add rows when a second component shares a property. Changing a name that is already in use is a major `version` change in every affected contract.
