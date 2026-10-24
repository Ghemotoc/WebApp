# Classics texts for the demo top-up

The full texts of about 20 short public-domain works (Romanian and English), one file each, read by `scripts/build-demo-content.ts` and published on staging under the official classics account with the "domeniu public" tag (decided 23 Oct 2026; S1-E5-06 and S1-E11-16 bring the real label and the staff screen after March).

Why the folder may be empty: the cloud session that builds the top-up cannot reach `ro.wikisource.org` or `gutenberg.org` (the environment's network policy denies them), so the texts are added by a person or by a session whose environment allows those hosts. Until then the top-up seeds the account and the synthetic stories only.

## Which works

Only titles marked `yes` in `pd_romania_2026` in `content/classics/G5_romanian-classics.csv` or `G5_english-classics.csv`, and only texts that are themselves free: the original, not a modern edition or translation with its own copyright. Skip rows whose `notes` warn about footnotes of unstated origin unless the footnotes are stripped. Credit the source as "source edition: [year]" only; the Project Gutenberg licence header and footer are removed and Gutenberg's name is not used (decided 23 Oct 2026).

## File format

`<slug>.md`, same front matter as `content/demo-stories/` with three extra lines:

```
---
id: classic-capra-cu-trei-iezi
title: Capra cu trei iezi
author: Ion Creangă
author_died: 1889
source_edition: 1875
language: ro
category: fiction
rating: all_ages
tags: domeniu public, basm, clasic
cover: drawn:doodles/sage/ink
blurb: …
---

## Capitolul 1

Text…
```

- `author` and `author_died` come from the CSV row; `source_edition` is the year of the edition the text was taken from.
- `rating` is a proposal for Robert to check (S1-E11-16: staff choose it; for example *Ion* is not All ages).
- Long works are split into chapters at the work's own divisions; a poem is one chapter.
- The build script checks ș and ț (comma below) and refuses HTML; it does not change the author's words.
