"""Split any chapter in the bulk packs that is past the database's 100,000-character limit.

Story S1-E11-16 (the classics load). The European packs were built on Robert's Mac from
Wikisource; a few works came out as one long verse passage or one unbroken paragraph, which
check_chapter_text() refuses (S1-E3-02a), and the "Load classics" workflow stopped on the
first of them (27 Nov 2026, part 273 of 945).

Who calls it: a person, once, before the next load: python3 scripts/classics/split-long-chapters.py
What it calls: mdtools.split_long (the same splitter the download uses, now able to cut inside a
block), then rewrites content/classics/bulk-2026-11/works-*.jsonl.gz in place.

Works listed in HOLD_BACK are taken out of the packs and added to not-loaded.csv instead, because
their text is not good enough to fix by splitting (scan page headers inside the text).
"""
import csv, glob, gzip, json, os, re, sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "eu-download", "tools"))
from mdtools import MAX_CHAPTER_CHARACTERS, split_long  # noqa: E402

PACKS = os.path.join(os.path.dirname(__file__), "..", "..", "content", "classics", "bulk-2026-11")
PART_WORD = {"ru": "часть", "pl": "część", "fr": "partie", "de": "Teil", "es": "parte", "it": "parte", "pt": "parte", "nl": "deel"}
# Checked by hand on 27 Nov 2026: whole chapters with no line breaks and printed page headers
# ("312 PARTE SECONDA") inside the sentences.
HOLD_BACK = {"it-novellas": "The Wikisource text has the printed page headers and page numbers inside the sentences, with no paragraph breaks"}


def base_title(title, part_word):
    """The chapter title without a " (part N)" ending the download added, or None if it has none."""
    match = re.match(rf"^(.*) \({re.escape(part_word)} \d+\)$", title)
    return match.group(1) if match else None


def resplit(chapters, part_word):
    """Join each run of numbered parts that holds a chapter over the limit, and split the run again.

    Returns the new list of chapters and how many were changed.
    """
    result, index, changed = [], 0, 0
    while index < len(chapters):
        title = chapters[index]["title"]
        base = base_title(title, part_word) or title
        # Step 1: the run of chapters that are parts of the same original chapter.
        end = index + 1
        while end < len(chapters) and base_title(chapters[end]["title"], part_word) == base:
            end += 1
        run = chapters[index:end]
        # Step 2: leave a run alone unless one of its chapters is too long.
        if all(len(chapter["body"]) <= MAX_CHAPTER_CHARACTERS for chapter in run):
            result.extend(run)
        else:
            joined = "\n\n".join(chapter["body"] for chapter in run)
            result.extend({"title": new_title, "body": body} for new_title, body in split_long(base, joined, part_word))
            changed += 1
        index = end
    return result, changed


def main():
    held = []
    for path in sorted(glob.glob(os.path.join(PACKS, "works-*.jsonl.gz"))):
        works, changed_here = [], 0
        for line in gzip.open(path, "rt", encoding="utf-8"):
            work = json.loads(line)
            if work["id"] in HOLD_BACK:
                held.append([work["id"], work["title"], HOLD_BACK[work["id"]]])
                changed_here += 1
                continue
            chapters, changed = resplit(work["chapters"], PART_WORD.get(work["language"], "part"))
            if changed:
                work["chapters"] = chapters
                changed_here += 1
                print(f"{work['id']}: now {len(chapters)} chapters")
            # Step 3: never write a chapter the database would refuse.
            longest = max(len(chapter["body"]) for chapter in work["chapters"])
            if longest > 100_000:
                raise SystemExit(f"{work['id']} still has a chapter of {longest} characters")
            works.append(work)
        if changed_here:
            with gzip.open(path, "wt", encoding="utf-8") as out:
                for work in works:
                    out.write(json.dumps(work, ensure_ascii=False) + "\n")
    # Step 4: record what was held back, once.
    listed = os.path.join(PACKS, "not-loaded.csv")
    known = {row[0] for row in csv.reader(open(listed, encoding="utf-8"))}
    with open(listed, "a", encoding="utf-8", newline="") as out:
        writer = csv.writer(out)
        for row in held:
            if row[0] not in known:
                writer.writerow(row)
                print(f"{row[0]}: held back")


if __name__ == "__main__":
    main()
