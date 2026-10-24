# Doodle assets on the canvas (style A, fine ink and colour)

Every picture the boards use. A board's `/_blob/<id>` is the file `design/assets/<id>.<ext>` in this folder. When building, copy what you need into `src/assets/` or `public/` with a readable name, and keep doodles as SVG (CLAUDE.md rule 16).

**Colours are tokens (Lane B, 23 Oct 2026).** Every doodle's colours are written as `var(--doodle-ink, #2a0e33)`: the design token when the SVG is drawn inline in a page (so it follows night mode), today's colour as a fallback when the file is opened on its own. `npm run doodles:tokens` rewrites new files this way and `npm run doodles:check` (run by CI) refuses any raw hex colour. The 16 drawn cover backgrounds in this folder (viewBox `0 0 100 160`) are left as they are: covers keep their colours in night mode (`src/lib/cover-colours.ts`). See `docs/code-tour.md`, "Doodles through the tokens".

| Doodle | url |
| --- | --- |
| 01 peeking cat | /_blob/046fb8a00941dcf5a7051dd98d11bbef |
| 03 cloud and moon | /_blob/86cce0664059fb540ee7ee3da590e514 |
| 04 sticky note "keep writing" | /_blob/137c7d20228c399caaacc3549a2c1b8b |
| 06 mug | /_blob/c96e4c6d379974d9168df6dc534ab327 |
| 09 open book with sparkles | /_blob/2b77dad1a2170495e93cea3190c0f1b7 |
| 15 peeking puppy | /_blob/41f4b2be1c6eb44f1e66f0bb09119a16 |
| 17 smiling heart | /_blob/c7264d2c28197ec223c423400809ee92 |
| 21 sunny face | /_blob/1de6769cdca825a91e29192b6f813576 |
| 28 desk lamp | /_blob/b6af94add128d6d8dc93670e26614f43 |
| 29 typewriter | /_blob/093d3efb301eb483969096d78322d770 |
| 31 rain cloud | /_blob/98cf6729b377176a6e850cfe42cbb1ab |
| 33 storm cloud | /_blob/620fcd7c3f2a0de7969b83ebedf084bc |
| 36 snowman | /_blob/255777b609a8e0d3a0e2e1aa15872f91 |
| 41 Christmas tree | /_blob/b31fe061058705129baa7c3df6b7066e |
| 47 jack-o'-lantern | /_blob/5e7f1aff6c31b5c3c503d70dec09b93b |
| 48 friendly ghost | /_blob/3f552d14fca9f8e869d5a5cff7d36901 |
| 73 two chat bubbles | /_blob/59feb281d9ed9664c1ef19c97f11612f |
| 79 star rating | /_blob/2f3b245d3e9394e517c1e3338d074aa5 |
| 80 trophy | /_blob/8b35eff002c7149d8059704ce00b23d2 |
| 81 medal with ribbon | /_blob/864dbfce6ade2bfbf4cff7a68aeca985 |
| 84 padlock | /_blob/04cfd05372dc9f8cb585691175c93244 |
| 85 shield with heart | /_blob/0ba01f0de219e755c8fa13cee158f7c5 |
| 86 magic wand | /_blob/1dc9eb802c05328c62a8eb50afa88846 |
| 87 crystal ball | /_blob/cfcf02d69f30c519081ecbfada8d7c9d |
| 98 mountains and sun | /_blob/d23931d1d3ec94db4671a17cfa9b3d3e |
| Contact sheet, all 100 (1848 × 5914 PNG) | /_blob/6d3e2cd0aa738fe466dcef47eba9fe0e |

Each SVG is square (viewBox -64 -64 128 128), transparent background.

## More doodles (uploaded 16 Oct, evening)

| Doodle | url |
| --- | --- |
| 02 flowers in a bottle | /_blob/1634f9ef3c76431d8c96ef7c753c480b |
| 05 ideas notepad | /_blob/f71342920dbb5c9f302486ccc693c98d |
| 07 envelope of flowers | /_blob/180ce4f7f379abdac70a25a6fd2013a1 |
| 08 pencil cup | /_blob/3418b6b2aefaca380d94789f7d9fb7f4 |
| 10 potted plant | /_blob/3b1eb2ea4b63edde44be9fd1a9bf7a68 |
| 11 candle | /_blob/5359ff3627957d5912319aa28b910eb0 |
| 12 bow | /_blob/dd80813ca73892903a43565606e60c94 |
| 13 books and plant | /_blob/d83027d3dd193abcc63034afc624a538 |
| 14 jar lantern | /_blob/dd5f7c42f258ececa180dd9f14853ad2 |
| 16 waves | /_blob/2b67ae23900ffff81e921f6ae258054c |
| 18 quill and ink | /_blob/96200adfcd22a04d24179eb458d6f66d |
| 19 tote bag of books | /_blob/bae81d9375db90401c3a77dd643c81f8 |
| 20 "once upon a time" | /_blob/5e4690feabb31976ed166122e11179ab |
| 22 rainbow | /_blob/8dcc7e60c7419e7bb73090ce5141c8c1 |
| 23 mushroom | /_blob/40bc1fbeb38f66f58e1d30bc529d4d2f |
| 24 snail | /_blob/ff639f727c03e7a669b0eb223c15e3c3 |
| 25 little bird | /_blob/3eb29ce44881d2b0ae1e93232991f874 |
| 26 butterfly | /_blob/36b54e06640486c6a06dbc26c16ecb5d |
| 27 reading glasses | /_blob/71c7c9a86495544c84425a6eef87e048 |
| 30 daisy | /_blob/c9a4e5b50989a61aafd82e0acc9ab805 |
| 66 fountain pen | /_blob/0c7ba638924252ccadbff50665a3ecd1 |
| 70 magnifying glass | /_blob/e0f2b1f7fbf2a3b0b83ef3044986ccc4 |
| 71 open spiral notebook | /_blob/f5c69995547466e6d428c768ff799288 |
| 90 teacup and saucer | /_blob/ed66e3e377878f68ee7af68fc1a709c4 |
| 93 sleeping cat | /_blob/24a7ac8f2dd38b86c302b928d2358327 |
| 100 folded map | /_blob/22476541414b1ec5bc70834bfc91ed12 |
| 32 snow cloud | /_blob/da3232396c64e1048a529b3872aa8e76 |
| 37 snowflake | /_blob/43e6ef4868d857990bf72ddb5c0e88c2 |
| 40 hot chocolate | /_blob/24c5157558871ed49e3bab4fc802e2cd |
| 52 autumn leaf | /_blob/f649bab025ce88672936a60fbc596247 |
| 55 cherry blossom branch | /_blob/6743650b6b06dc1e458fa25e7e9ea202 |
| 61 kite | /_blob/b82a2ffa9fe0cf7876402ee97900856a |
| 63 heart balloon | /_blob/23be67a233f4be95609f0a2f1d6d0523 |
| 67 pencil | /_blob/cb01c13602029560ca242fb10bc704d2 |
| 72 scroll | /_blob/8de6c5da34262acc233de02260ec84a2 |
| 74 headphones | /_blob/eb21c495c32eaeef13158fae59efc414 |
| 75 music notes | /_blob/40cdbaaf6198533e2f6d7bc49637ce3b |
| 76 camera | /_blob/b25ec0919b34c00f3d54942429d2bcce |
| 77 laptop with heart | /_blob/b35d215e80666d8ba0d495fa92147b8d |
| 78 phone with heart | /_blob/db266190ddac4dbcbaaa474e441625da |
| 82 crown | /_blob/6d08de11995e148d0b8ffc0654498644 |
| 88 planet with ring | /_blob/0344d85a4d2b52a73cd0499f4b920d88 |
| 89 rocket | /_blob/4526965d388ed8bbd98b3f239e74ce87 |
| 91 croissant | /_blob/b40a3e9cdd2089671ef98abc64a43b0a |
| 92 cookie | /_blob/54accc0ef3e17953e306b84980f3448a |
| 94 bunny | /_blob/1fa8eb24121f031c32cd0447c9096cc4 |
| 95 owl with reading glasses | /_blob/a9befe4541d43bb2eb0d8a7a222b3f51 |
| 96 fox | /_blob/6f96cbe7beb1f3250250f5494a549e03 |
| 97 bee | /_blob/6febd794abf68310f4d8fcb7da994e51 |
| 99 hot air balloon | /_blob/c23111eab51687499254aff73a9f8fa8 |

## Doodle ICONS (bold, made for 20 to 48 px)

| Icon | url |
| --- | --- |
| bell (notifications) | /_blob/209b6799fccfbd6e75b082c4f47b9024 |
| book | /_blob/34909fd02d01dca4db7586398487c06a |
| bookmark (save, library) | /_blob/5f8d75d939b1aa7b54167ac2b5ecaa06 |
| calendar (schedule, dates) | /_blob/aa624b96e88057896d273ba76dc51e54 |
| certificate | /_blob/cc63067f5d0a8be856e88047249284b0 |
| chart (stats, metrics) | /_blob/0ad6616dc0961cbdad79e7cdb3f3edd1 |
| clock (time, reading time) | /_blob/ebeb72eda012a960ba1bf4d5da485639 |
| coin (money, supporter) | /_blob/060ac41a12ead8bd579a403974c95c04 |
| comment | /_blob/e14867216e97778f2dc03dbb8a120de2 |
| compass (discover) | /_blob/26eb453f0f959c79c2e7ca60536e0dd2 |
| download-app (phone) | /_blob/7939e98f5cad75f6297ff489d09f93e0 |
| eye (reads, visibility) | /_blob/98631b9435453dabc49fb5955934c76d |
| globe (language, country) | /_blob/d015e4df9fe6c8aad2c786d53340afd6 |
| group (members, followers) | /_blob/176095cf8bd01644ba06ec40c1948c4b |
| heart (like) | /_blob/5b8ff50f6850841f7eeca2c5c2d0001f |
| home | /_blob/27931f3f7d9243438934ed85b178e8d4 |
| laptop (desktop app) | /_blob/efa7267d3b9865c596fab4fb3a28f90e |
| library | /_blob/c796dbb94b083dac77dd8c7444e30d20 |
| lightbulb (ideas, tips) | /_blob/99f7759af221b58ac00a6a2fb3bf930a |
| lock (privacy, private) | /_blob/63a0b034f6e684107133f4d8a6a7f33b |
| mail (email, messages) | /_blob/c485c45c1cc2ccf85edace3a1bbaca8b |
| medal | /_blob/4afc37a2cca377c4e5f2851d5bda78b4 |
| music | /_blob/9e299d46a57b4e6739c361e1936b1fee |
| open-book (read) | /_blob/a7c7799609e54821cf904f7c954834d0 |
| picture (image, cover) | /_blob/75b285508a299ed13b6c91845896d52e |
| report-flag | /_blob/ae8f02790d37696714544a9eee93345b |
| school (class, teachers) | /_blob/fd092eee2dd594dab11cd2a184b7138f |
| search | /_blob/55f422a6526ded4541da26a992747953 |
| settings (gear) | /_blob/86d5d1ab40063c9c460579d5ad428d06 |
| share | /_blob/4dfbea41a7d32d930e7dcd15a1c1381b |
| shield (safety) | /_blob/64266e3ee4beebf7d32232550d945d4d |
| sparkle-new (new, featured) | /_blob/b723972f835d5076dcde790872b012da |
| star (rating, featured) | /_blob/9119ec3d8d0fe8576e0efa4120090632 |
| trophy (contest) | /_blob/bce56c2d54680b7b32b00a7d53382b01 |
| user (profile, account) | /_blob/d3fb44b1b558f51871c870cf45b461ba |
| video | /_blob/87fbe5704a7e5e85ed2c7922b938499b |
| write (pen, Write button) | /_blob/43adcaa63658a9f9f04c831dedc54baf |

## Rules (Robert, 16 Oct evening)
1. **Doodle icons replace icons** wherever there's an icon, EXCEPT:
   - arrows and chevrons (back, next, expand, sort, dropdowns, external-link arrows);
   - close (×), check/tick and minus/plus controls in forms, steppers and toggles;
   - status icons whose meaning must be instantly clear for accessibility (error, warning, info, success badges, required markers, password show/hide inside fields);
   - anything that has to be smaller than 18 px.
   When you replace an icon: `<img src="…" alt="" aria-hidden="true" width height>` at the size the old icon used (or a little bigger, 20 to 32 px in buttons and nav, 32 to 56 px in feature cards). If the icon was the only label of a button or link, keep or add `aria-label` on the button/link itself so it stays accessible. Keep touch targets 44 px.
2. **Decorative doodles everywhere**, as Robert put it: "play with the sizes, make them bigger, smaller, and put them all over the place". Mix sizes freely from about 40 px up to 260 px, tilt them a little (-12° to 12°), let some peek out from card corners or sit on edges, scatter small ones (sparkles, hearts, leaves) in empty margins. Aim for roughly 4 to 10 per screen depending on size and how much empty space there is, more on the website and social posts, fewer on dense staff screens.
3. Never put a doodle over or behind text, form fields, buttons or chapter text; never inside the chapter reading column. Decorative ones are `alt="" aria-hidden="true"`, `pointer-events: none`. Prefer `position: absolute` inside a `position: relative` parent so layout doesn't move; keep them inside the board's width so nothing scrolls sideways at phone width (hide or shrink big ones under 600 px with a helmet media query if needed).
4. Vary which doodles you use; don't repeat the same one twice on one screen unless it's a tiny sparkle or heart.
