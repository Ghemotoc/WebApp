# Demo stories (investor demo, January 2027)

Synthetic stories for the staging demo (Robert, chat, 23 Oct 2026): 30 to 40 Romanian stories (three in English) with 2 to 4 chapters each, written by the seed personas and a few new synthetic writers. `scripts/build-demo-content.ts` turns these files into `supabase/staging-topups/demo-content-2a.sql`. Nothing here is loaded in production.

## Rules for every story

- **Synthetic only.** Invented text, invented people, invented places where a real one would be named. Never a real person's name, work or words. Never a real author's lines, not even a quote.
- **Romanian with ș and ț** (comma below), never ş and ţ (cedilla). The build script refuses a cedilla.
- **Plain Markdown subset** (CLAUDE.md rule 8): paragraphs separated by a blank line, `*italic*`, `**bold**`, `—` dashes and `„ ”` Romanian quotes are fine. No HTML tags, no links, no images, no headings inside a chapter body (the `##` lines are the chapter titles).
- **Fit the rating.** All ages: nothing a 10-year-old shouldn't read. 13+: mild peril, first love, loss, a swear word at most. 16+: darker themes, violence described without relish, strong language; still no sexual content and nothing about abuse or coercion (that needs a content note and is out of scope for the demo).
- **Length.** Prose chapters 300 to 500 words each. Poetry "chapters" are one poem or a short cycle, 120 to 300 words each. Blurb at most 500 characters, title at most 120.
- **Tags**: 2 to 6 per story, lower case, in the story's language, at most 40 characters each.
- **Covers**: `automatic` (nothing stored) or `drawn:<design>/<background>/<accent>`, with design one of `plum ink violet gold lilac blush sky sage paper stripes dots grid waves starry doodles twotone` and background and accent one of `plum ink violet gold lilac blush sky sage paper` (S1-E3-01). Pick a background and an accent that differ.

## File format

One file per story, `demo-NN.md` (`NN` from the assignment table). A front-matter block, then one `## ` heading per chapter.

```
---
id: demo-07
title: Harta orașului care nu există
writer: ana_cu_harti
language: ro
category: fiction
rating: 13_plus
tags: hărți, oraș, mister, prietenie
cover: drawn:waves/sky/violet
blurb: Două prietene găsesc o hartă a Bucureștiului pe care apar străzi ce nu au fost construite niciodată. Într-o seară, una dintre ele o ia pe o astfel de stradă.
---

## Capitolul 1: Strada fără nume

Prima frază a capitolului…

## Capitolul 2: Ce era în spatele ușii

…
```

- `writer` is a handle from the writers table below.
- `language` is `ro` or `en`; `category` is `fiction`, `poetry` or `nonfiction`.
- `rating` is `all_ages`, `13_plus` or `16_plus` (no 18+ in the demo).
- Chapter headings: `## Capitolul N: Titlu` in Romanian, `## Chapter N: Title` in English; for poetry the heading is the poem's title (`## Titlul poemului`).

## Writers

Seed personas (already exist on every database) and five new synthetic writers (created by the top-up, `@personas.test`, fixed IDs 101 to 105). Pen names are invented, not real people.

| Handle | Pen name | Who | Voice |
| --- | --- | --- | --- |
| `adult_writer` | Lia Scrie | seed persona, 30 | warm literary fiction about families and small towns |
| `teacher` | (handle only) | seed persona, 40 | gentle stories for younger readers; a few short essays about reading |
| `teen_17` | (handle only) | seed persona, 17 | poems and short pieces about school, friends and the city |
| `blocker` | (handle only) | seed persona, 30 | brisk mysteries and adventures |
| `blocked` | (handle only) | seed persona, 17 | one or two short stories (so the block rule can be shown) |
| `ana_cu_harti` | Ana cu Hărți | new, 34 | urban fantasy, maps, cities that shift |
| `tudor_farasomn` | Tudor Fărăsomn | new, 41 | night-time essays and quiet horror for 16+ |
| `ilinca_noaptea` | Ilinca Noaptea | new, 27 | poetry and prose poems |
| `radu_din_deal` | Radu din Deal | new, 52 | village stories, humour, folklore retold (invented, never a real tale) |
| `sofia_cerneala` | Sofia Cerneală | new, 23 | science fiction and coming-of-age |

## Assignment table

| Files | Writers | Language | Categories | Ratings | Covers |
| --- | --- | --- | --- | --- | --- |
| demo-01 to demo-09 | adult_writer ×3, ana_cu_harti ×3, radu_din_deal ×3 | ro | fiction ×8, nonfiction ×1 | all_ages ×4, 13_plus ×3, 16_plus ×2 | drawn ×5, automatic ×4 |
| demo-10 to demo-18 | sofia_cerneala ×3, blocker ×3, tudor_farasomn ×3 | ro | fiction ×6, nonfiction ×3 | all_ages ×3, 13_plus ×3, 16_plus ×3 | drawn ×4, automatic ×5 |
| demo-19 to demo-27 | ilinca_noaptea ×4, teen_17 ×3, teacher ×2 | ro | poetry ×6, fiction ×2, nonfiction ×1 | all_ages ×5, 13_plus ×3, 16_plus ×1 | drawn ×5, automatic ×4 |
| demo-28 to demo-36 | adult_writer ×2 (en), sofia_cerneala ×1 (en), blocked ×2, teacher ×2, radu_din_deal ×1, ana_cu_harti ×1 | en ×3, ro ×6 | fiction ×7, poetry ×1, nonfiction ×1 | all_ages ×4, 13_plus ×3, 16_plus ×2 | drawn ×4, automatic ×5 |

Totals: 36 stories; ratings 16 All ages, 12 13+, 8 16+; 33 Romanian, 3 English; 23 fiction, 7 poetry, 6 nonfiction.

## Robert's reading sample

Robert reads every title and blurb, plus five whole stories. The build script marks the five to read with `sample: yes` in the front matter: pick one per writer voice and one per rating, spread across the four groups (the group's author of record notes the choice in the pull request).
