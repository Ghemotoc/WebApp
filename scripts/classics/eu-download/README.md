# European classics download (27 Nov 2026)

Downloads the free European classics from Wikisource (ru, pl, fr, de, es, it, pt, nl), keeps only
the author's text and packs one JSON line per work into `out/<lang>.jsonl.gz`. The packs then become
classics SQL through `scripts/classics/build-load-sql.py` in a later pull request; nothing here writes
to a database.

- `eu/rows.json`: the works that are free in all 11 launch markets and have a Wikisource page
  (research list of 26 Nov 2026).
- `eu/meta/<lang>.tsv`: id, rating and a short blurb in the work's own language.
- `tools/`: the downloader (`wsapi_eu.py`, `wsapi_listed.py`), the HTML-to-Markdown converter
  (`convert_ws.py`, `mdtools.py`) and the builder (`build_eu.py`).
- Run: `bash run.sh` (or `bash run.sh pl fr` for some languages). Stopping and starting again is safe.

Credits: every work carries "Wikisource, CC BY-SA 4.0" plus the page revision link.
