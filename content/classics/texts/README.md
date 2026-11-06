# Classics texts for the demo top-up

The full texts of 20 short public-domain works (14 Romanian, 6 English; *Capra cu trei iezi* was added in a follow-up, after Wikisource's API had refused this session's address for about two hours), one file each, read by `scripts/build-demo-content.ts` and published on staging under the official classics account (`clasice`, its names read from `settings`) with the "domeniu public" tag (decided 23 Oct 2026; S1-E5-06 and S1-E11-16 bring the real "Public domain" label and the staff screen after March).

## Which works

Only titles marked `yes` in `pd_romania_2026` in `content/classics/G5_romanian-classics.csv` or `G5_english-classics.csv`, and only texts that are themselves free: the original, not a modern edition or translation with its own copyright. Rows whose `notes` warn about footnotes of unstated origin, editors' notes or a translator are not used; footnotes are never copied. The build refuses an author who died too recently (Law 8/1996 art. 28(1) and 34: life plus 70 years from 1 January after death, so in 2026 authors who died in 1955 or earlier).

## Where the texts come from, and the credit each one carries

| Source | Licence of the transcription | Credit line under the blurb |
| --- | --- | --- |
| ro.wikisource.org | **CC BY-SA 4.0**. The works are public domain; Wikisource's transcription and layout are shared under CC BY-SA, which asks for attribution and a note of changes | "Ediția sursă: [year]. Text: Wikisource, [permanent link to the exact revision], CC BY-SA 4.0; formatare adaptată." |
| gutenberg.org | Public domain in the US; the Project Gutenberg licence applies only while its name and header are kept | "Source edition: [year]." only. The licence header and footer, "Produced by" credits and any line naming Gutenberg are removed, and the name is never used (decided 23 Oct 2026; the build refuses a classic whose text names Gutenberg) |

**Share-alike.** Our formatted copies of the Wikisource texts are adaptations, so they stay under CC BY-SA 4.0: anyone may reuse them on the same terms. That covers only these files and the chapters made from them, never the platform's own code or other content. The credit line stays with the text wherever it is shown (today: under the blurb on the story page).

**What `source_edition` means.**
- Wikisource: the year the source page itself names, beside the title ("Floare albastră (1873)") or in its notes ("publicată prima oară … 1876"), so anyone can check it against the linked revision.
- *Sara pe deal*, *Balada unui greier mic* and *Neghiniță* have a blank year: their pages name none, and the lookups on Wikisource's author and collection pages were refused (HTTP 429) on every try, so no year could be confirmed.
- When the Wikisource page names no year, the year comes from Wikisource's own page for the author or the collection; if it can't be confirmed there, `source_edition` is left blank and the credit line gives only the source (CTO, 24 Oct 2026: blank rather than a guess). The build allows a blank year only for Wikisource texts, whose credit still carries the link and licence.
- Gutenberg: the year the ebook names for its edition (*A Christmas Carol*: the 1843 preface; *Goblin Market*: Oxford World's Classics, 1913). When the ebook names no edition (*The Raven*, *The Fall of the House of Usher*, *The Yellow Wallpaper*, *The Rime of the Ancient Mariner*) it is the first publication year, and the transcription may follow a later revision (Poe and Coleridge revised these). Replace it when the edition is known.

**What was changed, and what was not.** Only formatting: the text was taken out of the page layout into the Markdown subset (paragraphs, verse line breaks, *italic*), hard-wrapped prose lines were joined, and ş/ţ with a cedilla were written as ș/ț with a comma below, as the app does for every saved text (`normalise_romanian_letters()`). The author's words, spelling and punctuation are as the source gives them, old spellings included ("visiter", "pita", "sara").

## How they were fetched

The rules for every source are in `content/classics/README.md`, "Sources and terms" (24 Oct 2026). This set was fetched by a one-off session on 24 Oct 2026:
- **Wikisource**, through its API (`action=parse`), one request at a time with a few seconds between them. The shared cloud address is often rate-limited (HTTP 429), so requests back off and retry. The pages fetched after the terms check also send the contact User-Agent and `maxlag`. Only the text was kept: the page header and its notes, navigation, licence banner, images, captions, footnote markers and footnotes were dropped, so nothing Wikisource contributors wrote is included. None of the 14 is a translation.
- **Project Gutenberg**: six plain-text files from `www.gutenberg.org/cache/epub/<n>/pg<n>.txt`, about 2 s apart. This was before the terms check; from now on use `/robot/harvest` or a mirror. Each file was cut to what lies between the START and END markers. All six authors died before 1956, so the works are public domain in the EU, not only the US.

To add a work later, follow the rules for its source, use the format below, then run `npm run demo:build`.

## File format

`classic-NN-<slug>.md`. The number `NN` fixes the story's ids, so never renumber a file once staging has it. Same front matter as `content/demo-stories/`, with four extra lines:

```
---
id: classic-06-luceafarul
title: Luceafărul
writer: clasice
author: Mihai Eminescu
author_died: 1889
source_edition: 1883
first_published: 1883
source_note: Text: Wikisource, https://ro.wikisource.org/w/index.php?oldid=148561, CC BY-SA 4.0; formatare adaptată.
language: ro
category: poetry
rating: all_ages
tags: domeniu public, clasic, poezie, eminescu
cover: drawn:starry/ink/gold
blurb: …
---

## Luceafărul

A fost odată ca-n povești,  
…
```

- `author` and `author_died` come from the CSV row; `source_edition` as above; `source_note` only for Wikisource texts.
- `first_published` (6 Nov 2026): the year the work first came out anywhere, shown as "First published" under "Labels from the writer". Not later than `source_edition`. Left blank when it can't be confirmed, and the row is then left out; the 4 blank today (Bubico, Iarna pe uliță, Balada unui greier mic, Neghiniță) are to verify.
- `rating` is a proposal for Robert to check (S1-E11-16: staff choose it; for example *Ion* is not All ages).
- Long works are split at the work's own divisions (Dickens's staves, Coleridge's seven parts); a poem or a short tale is one chapter. Classics keep the author's length: the demo stories' word limits don't apply.
- The blurb plus its credit line must fit in 500 characters.
