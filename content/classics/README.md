# Public-domain classics

What this folder holds:

| File or folder | What it is |
| --- | --- |
| `G5_romanian-classics.csv`, `G5_english-classics.csv` | The candidate works (research G5): title, author, the author's death year, kind, and public-domain status in Romania, the UK/EU and the US for 2026, with notes. A title is used only when `pd_romania_2026` is `yes` |
| `texts/` | The full texts actually published, one Markdown file each, with their source and credit line. How they were fetched and formatted is in `texts/README.md` |

The rule behind every title: in Romania copyright lasts for the author's life plus 70 years, counted from 1 January after the death (Law 8/1996 art. 28(1) and 34), so in 2026 authors who died in 1955 or earlier are free. A newer edition, translation or editor's notes can carry their own copyright, so the text we take must be the free original (S1-E5-06).

## Sources and terms

Decided 24 Oct 2026 by the CTO, from a check of each site's terms. Only the sources in the first table may be used, each under its own rules. The environment allows these hosts: `*.wikisource.org`, `wikisource.org`, `upload.wikimedia.org`, `www.gutenberg.org`, `gutenberg.org`, `standardebooks.org`, `deutschestextarchiv.de`, `liberliber.it`, `gutenberg.net.au` and `fadedpage.com`.

| Source | How to fetch | What we may keep | Credit and checks |
| --- | --- | --- | --- |
| **Wikisource** (any language, `*.wikisource.org`) | Download and store the text locally; never proxy or embed live pages. A descriptive User-Agent with a contact (`GhemotocBot/0.1 (hello@themagiccoffin.com)`), one request at a time, the `maxlag` parameter, about 1 s between requests; on HTTP 429 back off and retry | The work's text. Drop anything Wikisource contributors wrote (annotations, notes, introductions) and contributors' own translations, unless we accept share-alike for them too | A per-text attribution line: the source page's URL with its revision id, and CC BY-SA 4.0. Our formatted copy stays CC BY-SA 4.0 (share-alike) |
| **Project Gutenberg** (`gutenberg.org`) | The website is for people and blocks bots: use `https://www.gutenberg.org/robot/harvest` or a mirror, with a 2 s wait between requests, and only a few files | The work's text only. Strip the header, the licence and every mention of Project Gutenberg | "Source edition: [year]" only. Check EU public-domain status per title: US public domain is not enough |
| **Standard Ebooks** (`standardebooks.org`) | The public book pages only; the bulk feeds are for paying patrons | Their editions are CC0 (their own work is dedicated to the public domain) | Check EU public-domain status per title, and watch for translations, which may still be protected |
| **Deutsches Textarchiv** (`deutschestextarchiv.de`) | The plain-text version only | The public-domain text; never the annotated XML or the page images | Credit "Deutsches Textarchiv" |
| **Liber Liber** (`liberliber.it`) | The plain public-domain text | The bare text only; never their layout or covers, which are CC BY-NC-SA | Check the author's death year per title |
| **Gutenberg Australia** (`gutenberg.net.au`) and **Faded Page** (`fadedpage.com`) | Download the text and strip their headers | The work's text only | These follow life-plus-50 countries: check per title that the author died before 1 January 1956 |

**Do not use** (commercial reuse barred, rights reserved, or terms that exclude us):

| Source | Why not |
| --- | --- |
| Gallica (BnF) | Commercial reuse needs a licence |
| Biblioteca Virtual Miguel de Cervantes | Rights reserved |
| Projekt Gutenberg-DE | Rights reserved on its editions |
| DBNL | Rights reserved |
| MEK (Magyar Elektronikus Könyvtár) | Commercial reuse barred |
| BCU Cluj digital library | Rights reserved |
| Wolne Lektury | Its terms bar platforms that restrict readers' copying, and our reader makes copying harder (S1-E4-06a) |

The demo top-up (24 Oct 2026) uses Wikisource (14 Romanian texts) and Project Gutenberg (6 English texts) only; the other sources are for later Classics work (S1-E5-06, S1-E11-16).
