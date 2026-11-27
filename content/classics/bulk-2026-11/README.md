# Bulk classics, November 2026

Robert asked on 26 Nov 2026 for every work on the research list "Research: public domain works for the launch markets" that is free in all 11 launch markets to go on the Classics shelf. This folder holds the texts that could be fetched that day, ready to load.

| File | What it is |
| --- | --- |
| `works-en.jsonl.gz`, `works-ro.jsonl.gz`, `works-nordic.jsonl.gz`, `works-ru.jsonl.gz` | The works, one JSON object per line, gzip-compressed: title, author, the author's death year, language, kind, rating, first publication, blurb, credit line and the chapters in the Markdown subset |
| `works-index.csv` | One row per work, to read without unzipping: title, author, language, year, kind, rating, chapters, length and source |
| `not-loaded.csv` | Works on the list whose text could not be fetched, and why |

## How to load them

Press Actions › "Load classics" › Run workflow on GitHub and type `LOAD` (`.github/workflows/load-classics.yml`). It needs the secret `CLASSICS_DATABASE_URL` once: the database's Session pooler connection string from Supabase › Connect. The workflow runs `scripts/classics/build-load-sql.py`, which writes SQL parts of under 450 KB, then runs them in order with psql. The same parts can be pasted into the SQL Editor one by one instead.

Each part defines `pg_temp.load_classic` (`scripts/classics/load-classic.sql`), which does what the Staff › Classics screens do (S1-E11-16): adds the author and the story under the official classics account, the `classic_works` row, the chapters (checked by `check_chapter_text()`), puts every chapter live with `chapter_publish_now()` once the last one is in, and writes the audit log under the owner account. It sends no notifications (`tell_followers` is false). Running it again is safe: a work is found again by its title and author, and only missing chapters are added. On a fresh local database it loaded all 268 works in about 7 minutes and grew the database by about 130 MB.

## Which works

The rule (research doc, Summary tab): free in all 11 markets in 2026 means the author died in 1955 or earlier and the work was first published before 1931 (the US rule). Works marked "some markets" or "except possibly US" were left out, and so were:
- the *Peter Pan* play (a UK royalty right), *Salomé* and Chekhov (translators not checked), Owen's *Poems* (Sassoon's introduction), the six Istrati titles (translator not checked);
- the three Romanian Gutenberg collections that repeat works loaded on their own, and Papadat-Bengescu;
- the 20 classics already on staging.

A translation names its translator and why it may be shown (`translation_rights` public_domain): *A Doll's House*, translated by R. Farquharson Sharp (died 1945).

## Where the texts come from

The terms for each source are in `../README.md`, "Sources and terms".

| Source | Works | Credit line (`source_title`, with `source_url`) |
| --- | --- | --- |
| Standard Ebooks | 98 English | "Standard Ebooks (CC0)" and the book's page. Twelve works sit inside a bigger Standard Ebooks collection (*Heart of Darkness* in Conrad's *Short Fiction*, the 25 stories of *The Four Million* in O. Henry's, the 13 poems of Keats's 1820 volume); only that work's sections were kept |
| English Wikisource | 5 English | "Wikisource, CC BY-SA 4.0; formatting adapted" and the exact revision |
| Romanian Wikisource | 121 Romanian | "Wikisource, CC BY-SA 4.0; formatare adaptată" and the exact revision |
| Russian Wikisource | 150 Russian (added 27 Nov 2026) | "Wikisource, CC BY-SA 4.0; оформление изменено" and the exact revision; where only a pre-1918 copy exists, the spelling was brought to modern spelling and the credit says so ("оформление и дореформенная орфография изменены"). Built by `scripts/classics/eu-download/` |
| Swedish, Danish and Norwegian Wikisource | 44 | the same credit in the work's language ("anpassad formatering", "tilpasset formatering") and the exact revision. Norwegian works use the language code `nb`, the platform's one Norwegian language |

Only formatting changed: the text was taken out of the page layout into the Markdown subset, very short pieces were joined into chapters of about 30,000 characters with their titles as subheadings, and chapters over 95,000 characters were split into parts. Wikisource's own notes, headers, navigation and footnotes were dropped. Wikisource's API refused this session's address (HTTP 429) on every call, so the texts were read from the ordinary page views, which carry the same text and revision id.

## Still to check (proposals, not decisions)

- Ratings, kinds and blurbs were written for this load. The Swedish, Danish and Norwegian blurbs need a native speaker's read.
- A few Romanian facts were uncertain: the years of *Lewki*, *Rusaliile*, *Piatra din casă*, *Cinel-Cinel*, *Ulița copilăriei* and the Urmuz texts.
- *Sultănica*: a few verse lines are missing at the source.
- *La Medeleni*: only the first volume, *Hotarul nestatornic*, is on Wikisource, and it is loaded under that title.
- In *Et dukkehjem* the cast list is in lower case, as the source sets it in small capitals.

## The check of 27 Nov 2026

Robert asked for every book to be checked before loading, for anything broken or anything that isn't the author's text. Each work was checked by script (empty or near-empty chapters, wiki code, HTML, footnote marks, editors' line numbers, notes and variant readings, source and scan lines, repeated chapters, broken characters) and its first and last lines were read by hand.
- **Russian:** 150 of 172 pass. The builder (`eu-download/tools/build_eu.py`, `convert_ws.py`) now drops editors' line numbers, notes and variant readings, a magazine's "От редакции", e-text and source lines, contents-list leftovers and modern editions' front matter, and it holds back a work when one of its pages didn't render on Wikisource (*Бесы*, *Война и мир*, *Что делать?*: "template include size too large"), when what came out isn't the work (contents lists, a cycle's first few stories), or when the author is anonymous (*Слово о полку Игореве*: `classic_authors.died_year` can't be empty). The 22 held back are in `not-loaded.csv`.
- **Romanian and Nordic:** `scripts/classics/fix-older-packs.py` removed wiki code (*La Medeleni*, *Familjen paa Gilje*), a scan's running heads (*La Medeleni*), printed page numbers (*Povestea vorbei*), printers' imprints on title pages, and wrote an editor's spelled-out abbreviations as plain words (*Pseudo-kynegetikos*).
- **English:** clean. Short chapters are short in the book ("Waking" in *Through the Looking-Glass*); Volpone's numbered speakers are Jonson's.
- **Polish and the other European languages** are not in this folder yet: they are checked language by language once the download finishes.
