# Button

Three kinds of button, and only one main button on a screen. Robert picked this look, soft tint, on 20 Nov 2026.

| Kind | Looks | Use for |
|---|---|---|
| Main | A flat `action-main` fill (plum #48125D by day, cobalt at night) with an `on-action-main` label; `action-main-hover` (violet #672786 by day) on hover and press. No rim, sheen or coloured shadow | The one next step: Continue, Start reading, Publish, Hand in |
| Quiet | `surface-tint` with no edge and an `ink` label; `line` on hover | Secondary actions: Add to a bookshelf, Follow, Share |
| Text | `ink`, underlined (2px on hover) | Tertiary actions inside bars and lists: Details, Plan, Preview |

- Height `control-height` (44px), corners `radius-full`, label in the `label` style (Inter 600, 15px).
- Keyboard focus draws `focus-halo` then a 2px `focus-ring`.
- **A button that cannot work yet stays pressable and says why beside it**, in the meta style: "Add a chapter title to publish." Pressing it takes the member to what is missing. Buttons are never greyed out.
- Labels start with a verb and say what happens: "Continue chapter 9", never "OK" or "Submit".
- A chip that is on (FilterChip) shares the plum. They never do the same job, and the chip also shows a check.

**Contrast:** the label is 12.9:1 on plum and 8.9:1 on violet by day; 8.4:1 on cobalt and 5.9:1 on its hover at night. A quiet button is 1.1:1 against the page by day, so its label (13.7:1) carries it, as WCAG 1.4.11 allows for a button named by its text.

**What changes in the code:** `button-main` drops the dark sheen, the inner shadows and the coloured shadow; in Lilac mist `--plum-from` and `--plum-to` both become #48125D (the other looks keep their own accents); `button-glass` becomes the tint with no edge; text buttons take `--ink`. This replaces the 11 Nov 2026 rule of a Revolver (#2A0E33) main button.

**Don't:** put two main buttons on a screen, colour a quiet button plum, use the main fill for navigation, or grey a button out.
