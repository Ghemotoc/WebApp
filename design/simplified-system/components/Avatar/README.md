# Avatar

Every comment, notification, message and account button shows the person (Robert, 20 Nov 2026: "they need to be with the avatars").

- **A member who built an avatar** shows it: DiceBear Micah, head and shoulders, in a circle (`img.gh-avatar`, `object-fit: cover` on `surface-tint`). No photos: pictures never show real people.
- **A member who keeps initials** gets a **plain coloured circle** with one or two initials (Robert, 20 Nov 2026). The colour is picked at random from the cover palette when they join, and they can change it in Settings under **Circle colour**.
- **Spaces** (classes, clubs and groups) use the same circles with their initials, unless they have a picture.
- **Sizes:** 32px in comments (`gh-avatar--sm`), 36px in bars and lists, 72px on a profile (`gh-avatar--lg`).
- **Names:** an avatar beside a name is decorative (`alt=""` or `aria-hidden`); one that stands alone, such as a space's circle, is named ("Class 9B").

| Class | Circle | Initials, contrast |
|---|---|---|
| `gh-avatar--lilac` | `cover-lilac` | `cover-ink`, 13.2:1 |
| `gh-avatar--blush` | `cover-blush` | `cover-ink`, 12.5:1 |
| `gh-avatar--sky` | `cover-sky` | `cover-ink`, 13.5:1 |
| `gh-avatar--sage` | `cover-sage` | `cover-ink`, 11.5:1 |
| `gh-avatar--gold` | `cover-gold` | `cover-ink`, 10.0:1 |
| `gh-avatar--plum` | `cover-plum` | `cover-paper`, 12.3:1 |
| `gh-avatar--violet` | `cover-violet` | `cover-paper`, 9.0:1 |

**Circle colour** in Settings is a radio group of the seven circles (`gh-swatches`), each 32px inside a 44px target and named for its colour; the chosen one has a ring in `action-selected`.

**Don't:** use photos, patterns or gradients in the circle, or rely on the colour to tell people apart: the name is always beside it.
