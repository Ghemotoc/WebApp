# Field

A text field or drop-down with its label above, a hint when it adds a fact, and an error that says how to fix it.

- Label in the `label` style; field `control-height` (44px), `radius-field`, `surface-field` with a `line-control` border (3:1 or more).
- Errors: a 2px `ink-danger` border plus a written message in `ink-danger`, linked with `aria-describedby`. Never colour alone.
- Drop-downs are as wide as their longest option, with a 14px chevron 14px from the right.

**Don't:** use placeholder text as the label, or stretch drop-downs to fill a row.
