# ADR 0005: Chapter text is stored as a Markdown subset, edited with TipTap

- **Date:** 23 October 2026
- **Status:** Accepted (Robert, chat, Q14 of the Lane A plan: TipTap approved)

## Decision

A chapter's text is stored as the Markdown subset named in CLAUDE.md rule 8: paragraphs, headings (levels 2 and 3), bold, italic, quote, bullet and numbered lists, the scene break (`* * *`) and links (http, https, mailto). It lives in `chapters.draft_body` while the writer works and in `chapters.published_body` once published (S1-E3-03).

The writer edits it in TipTap (ProseMirror underneath, MIT licence), loaded only on the editor route. The editor never sees Markdown: two converters we own translate at the edges (`src/features/writing/lib/chapterMarkdown.ts`), Markdown → document when the chapter loads and document → Markdown on every save. Only the allowed node types exist in the editor, so nothing else can be typed or pasted in.

The text is sanitised twice on save, as architecture 1.9 asks: the shared zod schema (`src/schemas/chapter.ts`) refuses HTML tags and `javascript:`/`data:` links and corrects ş/ţ to ș/ț; `save_chapter_draft()` does the same in the database (`check_chapter_text()`), so a client that skips the editor still can't store a script. Before display, react-markdown renders it with raw HTML off and `rel="nofollow ugc noopener"` on links (S1-E4-01a).

## Why Markdown rather than the editor's JSON

- Rule 8 names Markdown.
- It exports to Word later (S1-E13-02), cuts cleanly for the teaser (S1-E4-04) and searches with Postgres full text (S1-E5-04).
- It is readable by a person in the database and in an export, which matters for data requests (S1-E11-09).
- The cost is the two converters, which have a round-trip test for every allowed node.

## Consequences

- A new kind of content (a picture, a drawing, an embed; S1-E3-09 to 11) needs a Markdown form, a converter case in both directions, an editor node and a renderer case, plus the server check.
- A writer's literal `*`, `_`, `#` and `<` are backslash-escaped in storage, so they come back as the same characters; the server's tag check ignores escaped pairs for that reason.
