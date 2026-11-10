<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

This is bundle NAV-1 from the builder's queue. It comes from Robert's notes of 6 Nov 2026, 18:40 UTC:
- "you need to go and press on Write so you can see them. I'd rather see them connected to library";
- "when you press on the name, it should go to the public profile. But then, in the dropdown, you also have the option to go to the settings profile";
- "what does 'Condei de povesti' mean? that sounds weird".

## What changed

**Account menu**
- The panel now opens with the person's name and @username, plus "View your public profile". This row links to `/u/<username>`.
- Under it are "Edit profile" (Settings › Profile, `/settings#profile`), Settings and Log out.
- Before a username is chosen there's no public profile yet, so the menu shows only Settings and Log out, as before.

**My stories in the Library**
- The Library's shelf chips gain a fourth chip, "My stories (n)". It shows the writer's own stories, drafts included.
- The stories use the same shared shelf as the other chips: one line of at most 20, with "View more" leading to Your writing.
- Each card says Draft, Ongoing or Completed and opens the story's chapters in the writing tools (`/write/s/<story>/chapters`).
- A link under the shelf goes to Your writing, for the numbers, comments and every story tool.
- With no stories yet, the empty state says where stories will appear and links to "Start a new story".
- Deleted stories (still restorable for 30 days) are left out, as on Your writing.

**Romanian rank names**
- The ranks are now Debutant, Scriitor, Povestitor and Romancier. They replace Debut, Condei, Condei de povești and Condei de roman, in both `forums.json` and `notifications.json`.
- English stays New writer, Writer, Storyteller and Novelist.
- Staff can still change any of these in Staff › Website › Interface text.

**Docs**
- `docs/decisions.md` has a new row for these choices.
- `docs/code-tour.md` and the auth and library READMEs are updated.

## How it was tested
- `npm run checks` on this branch: RESULTS
- New tests:
  - e2e `nav-1.spec.ts`: the name opens the public profile; Edit profile opens Settings › Profile; My stories shows a draft and opens its chapters; axe on the shelf and on the open menu at 390 px in ro and en.
  - Vitest `src/features/library/lib/ownStories.test.ts`.
- Screenshots of the open menu (390 px) and the My stories shelf (1440 px) show nothing overlapping or scrolling sideways.

## By hand
- Nothing on staging.
- Robert reads the new Romanian text: Poveștile mele, Ciornă, Editează profilul, Vezi profilul tău public and the four rank names.

## Follow-ups
- None.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
