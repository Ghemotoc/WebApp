<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

This is parts (e) and (f) of the CMS-1 bundle in Robert's full-app plan. They come from his tag task in the project thread (30 Oct 2026, 10:43 to 10:50), which has no story or issue of its own. I haven't opened one (CLAUDE.md: new issues only when Robert asks).

What Robert asked for:

- "There should be always some option to add tags. The tags are separated by comma."
- "Please add some recommended tags in advance."
- "Users can add additional tags, however, they need to be approved by a member of staff."
- A tag has the same name in every language: Fantasy, Fantezie, Fantaisie.
- A name typed in another language is recognised and changed to the interface language.
- Staff translate tag names by hand when a market opens.

Part (g), rank badges on covers, comes next.

## What changed

### Database (`…100007_cms_1e_tag_enums.sql`, `…100008_cms_1e_tags.sql`)

- **`tags`** gains:
  - `status`: waiting, approved or rejected. Every tag already in use is approved, so nothing readers see today disappears.
  - `is_recommended`.
  - Who decided, when and why.
- **`tag_names`** (kind `platform`, RLS on): a tag's name in each language. The names of approved tags are public (`tag_names_select_public`).
- **Read policies on `tags`:**
  - `tags_select_public`: approved tags only.
  - `tags_select_on_own_story`: a writer sees their own waiting tags.
  - `tags_select_staff`: owner, admin and moderator see every tag.
- **`set_story_tags()`** now:
  - finds a typed name's tag in any language (`tag_for_name()`), so "fantezie" and "Fantasy" are one tag on a story;
  - makes a waiting tag for a name nobody used before;
  - leaves out a name staff rejected.
- **`get_story_page()` and `list_holds_story()`:** readers, story pages and tag pages see approved tags only. A tag page finds its tag by any of its names.
- **The staff queue:**
  - `admin_list_tags('waiting' | 'missing' | 'approved')` lists tags with story counts, never who used them.
  - `admin_name_tag()` approves or renames a tag. It needs a name in every interface language, none of them already another tag's name in that language. Logged as `tag.approved` or `tag.named`.
  - `admin_reject_tag()` takes the tag off every story and sends each writer a new `tag_rejected` notification. Logged as `tag.rejected` with the reason.
  - All three check the moderation area (owner, admin, moderator).
- **45 recommended tags in Romanian and English.** Tags already in use that mean the same thing are merged into them, with their stories kept. For example, `familie` and `family` become Family.

### App

- **The tag box** (`TagInput`):
  - each chip shows its tag in the interface language;
  - a name typed in another language becomes that language's name;
  - a new tag says "(waiting for approval)";
  - the recommended tags sit under the box (`TagSuggestions`: the first twelve, then "Show all").
  - The hint now says commas separate tags and that new tags are checked.
- **Tags shown in the reader's language:** the story page, the writer's story cards, the preview and the editor's Story details.
- **Staff › Tags** (`/staff/tags`, `/staff/tags/missing`) for owner, admin and moderator:
  - a name field per interface language;
  - Approve or Save the names;
  - Reject, with a reason.
  - It is a new menu item after Moderator mail.
- **The `tag_rejected` notification** names the story and links to its settings. It never names the member of staff or the reason.

## How it was tested

- **pgTAP:**
  - `175-tags` (24 tests): the allowed and denied tests for each new policy, recognition in either language, waiting tags hidden from readers, every refusal, the audit rows, a rejected name not coming back.
  - `101`, `103` and `152` follow the new rules.
  - `021` covers `tag_names`.
- **Vitest:** `tagCatalogue.test.ts`.
- **Playwright:** `e2e/tags.spec.ts` (28 tests, with axe on Staff › Tags at 390, 768 and 1440 px, light and night, ro and en). The staff menu lists in two specs gained Tags.
- The full local check run: see below.

## Choices

- **Who decides:** a member of staff means the moderation team (owner, admin and moderator), as in Robert's message. Support and the content editor can't.
- **When a waiting tag shows:** only to its writer, until approved. Writers can still use any name; nothing is refused at save time.
- **Merging tags:** a rejected tag is never merged into another tag. A writer who meant an existing tag picks it again. Merging is a follow-up if staff need it.

## Follow-ups

- A "merge into another tag" action in the queue.
- AI suggestions for tag names (by-hand list; needs an ADR and a data processing agreement).

## By hand

Nothing on staging. The migration approves the tags already there and merges the demo tags that match a recommended one.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
