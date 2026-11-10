# Component mini-spec

Used in mode B (new component). The user fills it in; Claude does not decide for them. Anything missing goes to "Open decisions".

```markdown
# Mini-spec: <ComponentName>

## 1. Purpose
One sentence: what problem it solves and for whom.

## 2. When to use it / when not to
- Use it when:
- Don't use it when (and what to use instead):

## 3. Content
- Required:
- Optional:
- System components it reuses:

## 4. Variants and sizes
What changes visually and why. Only what is necessary.

## 5. States
Hover, focus, active, disabled, loading, selected, empty, error… Mark which ones apply.

## 6. Behavior
- Main interaction:
- Keyboard:
- Animation or transition (if any):

## 7. Responsive
What changes, at what width and how (collapses, stacks, hides, scrolls).

## 8. Accessibility
- Semantic element/role:
- Accessible name:
- Tab order:

## 9. Content and copy
Length limits, tone, long texts.

## 10. Open decisions
What you do not know yet.
```

## How it becomes a contract

| Section | Contract block |
| --- | --- |
| 1 Purpose | `description` |
| 2 When to use | `guidance.dos`, `guidance.donts`, `guidance.related` |
| 3 Content | `anatomy`, `composition`, `props` (slots and children) |
| 4 Variants and sizes | `props` (`variant`, `size`…), `tokens.bindings.byVariant/bySize` |
| 5 States | `states.native` / `states.controlled` |
| 6 Behavior | `events`, `behavior`, `a11y.keyboard` |
| 7 Responsive | `behavior.responsive` |
| 8 Accessibility | `semantics`, `a11y` |
| 9 Copy | `content` |
| 10 Open | `meta.needsReview` (as questions, not as decisions) |

The tokens of a new component do not come from the spec: either you choose them from the existing ones (`tokens/`) with the user, or you leave them as `needsReview` until the design exists.

If 1, 3, 7 or the main action are missing, ask for those answers before writing the contract.
