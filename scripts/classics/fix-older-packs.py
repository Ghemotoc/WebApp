"""One-off clean-up of the packs built on 26 Nov 2026 (works-ro, works-nordic), after the book-by-book
check of 27 Nov 2026 (CONTENT thread). Usage: python3 scripts/classics/fix-older-packs.py
Rewrites content/classics/bulk-2026-11/works-<pack>.jsonl.gz in place; safe to run twice.
What it removes is never the author's text: wiki code typed wrongly in the source, a scan's running
heads ("288 IONEL TEODOREANU"), printed page numbers standing alone on a line, printers' imprints on
title pages; and it writes an editor's spelled-out abbreviation ("d\\<omnu\\>l") as the plain word."""
import gzip, json, os, re

PACK_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "content", "classics", "bulk-2026-11")
IMPRINT = re.compile(r"TIPOGRAFIA|LIBRARIEI|LIBRĂRIEI|EDITURA|Calea Victorie|INSTITUTUL DE ARTE GRAFICE", re.I)

def fix_body(work_id, body):
    """Return the chapter body with the leftovers for this work removed."""
    body = re.sub(r"\{\{\{\d+\}\}\}|\{\{nop\\?\]\\?\]|\{\{dhr\}\}?", "", body)
    body = re.sub(r"^\d{2,4} [A-ZĂÂÎȘȚ ]{6,}$\n?", "", body, flags=re.M)  # a scan's running head
    if work_id == "ro-la-medeleni":
        body = re.sub(r" ?\b\d{2,4} IONEL TEODOREANU\b", "", body)  # running head inside a paragraph
        body = re.sub(r"^IONEL TEODOREANU$\n?", "", body, flags=re.M)
    if work_id == "ro-povestea-vorbei":
        body = re.sub(r"^\d{2,3}\s*$\n?", "", body, flags=re.M)  # printed page numbers
    if work_id == "ro-pseudo-kynegetikos":
        body = re.sub(r"\\<([^\\<>]{1,12})\\>", r"\1", body)  # "d\<omnu\>l" -> "domnul"
    return re.sub(r"\n{3,}", "\n\n", body).strip()

def drop_imprint(body):
    """Drop printers' imprint paragraphs from the first few paragraphs of a title page."""
    paragraphs = body.split("\n\n")
    head = [p for p in paragraphs[:12] if not IMPRINT.search(p)]
    return "\n\n".join(head + paragraphs[12:])

def main():
    for pack in ("works-ro", "works-nordic"):
        path = os.path.join(PACK_DIR, pack + ".jsonl.gz")
        works = [json.loads(line) for line in gzip.open(path, "rt") if line.strip()]
        for work in works:
            for index, chapter in enumerate(work["chapters"]):
                body = fix_body(work["id"], chapter["body"])
                if index == 0: body = drop_imprint(body)
                chapter["body"] = body
        with gzip.open(path, "wt", compresslevel=9) as out:
            for work in works: out.write(json.dumps(work, ensure_ascii=False) + "\n")
        print(pack, len(works), "works rewritten")

if __name__ == "__main__":
    main()
