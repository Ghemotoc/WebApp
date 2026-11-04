<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Bundle 14c IDEAS-2, part e: Canva cover templates with the title already placed (idea IDEA-20261101-10, approved on 2 Nov 2026, 22:00). This idea has no story issue. It is built against the Canva stand-in, as planned, until the Canva keys exist (GO-LIVE).

## What changed

- "Design it in Canva" now opens a short "Where do you want to start?" page in the new tab. The choices are:
  - Blank design, as before;
  - Classic, Bold or Handwritten: each a cover template with the story's title and the writer's pen name already in place.

  Each choice has a small sketch with the real title and pen name (criterion 1).
- Blank design is picked at first, so pressing "Open Canva" straight away gives today's empty cover (criterion 2).
- The choice is remembered by the tab, so a writer who first has to connect Canva still lands in the template they picked.
- Our server fills the template through Canva's autofill of brand templates, putting the title and pen name in the template's `title` and `pen_name` fields. A template that isn't set up yet, or that Canva can't fill, opens the blank cover instead, so the writer can always start.
- The note under the button now mentions the templates. The stand-in's editor names the template it started from, so the tests can see it.
- ADR 0009, `docs/mocks.md` and the code tour are updated.

## Tests

- New unit tests for the real Canva service, with a fake Canva (4 tests):
  - a template is filled with the title and pen name;
  - a template with no ID opens blank;
  - a failed fill opens blank;
  - choosing blank never asks for a template.
- `canva-covers.spec.ts`:
  - picking Classic survives the consent page and opens the Classic template;
  - Blank design opens the empty cover;
  - the start page passes axe and fits at 390 (Romanian), 768 and 1440 px.

## Local check run

LOCALRUN

## By hand

GO-LIVE, added to the Canva line in `docs/mocks.md`:

1. Design the three brand templates in Canva, with text fields named `title` and `pen_name`.
2. Set `CANVA_TEMPLATE_CLASSIC`, `CANVA_TEMPLATE_BOLD` and `CANVA_TEMPLATE_HANDWRITTEN` in Cloudflare.

Until then every choice opens the blank cover.

## Questions for Robert

- Canva has offered brand templates and autofill only to Canva Enterprise. Writers use their own Canva accounts, so the templates may not work for most of them. This needs checking with Canva once the developer app exists.
  - If it doesn't work, we can drop the template choices and keep Blank design only. This is one small change.
  - Or we can bake the title and pen name into a starting picture instead. It looks similar, but the text can't be edited in Canva.

  Not urgent: nothing changes until the Canva keys are set.

## Follow-ups

None.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
