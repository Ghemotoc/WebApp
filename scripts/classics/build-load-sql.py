"""Turn the bulk classics files into SQL parts that load them into a Supabase database.

What it is for: the bulk load of public-domain classics Robert asked for on 26 Nov 2026
(story S1-E11-16 made the classics tables and helpers this builds on).
Who calls it: the "Load classics" GitHub workflow (.github/workflows/load-classics.yml), or a
person by hand: python3 scripts/classics/build-load-sql.py <out_dir> [<works file> ...].
What it calls next: nothing; it writes part-001.sql, part-002.sql, ... into <out_dir>. Each part
is one transaction: it defines pg_temp.load_classic (scripts/classics/load-classic.sql) and calls
it once per piece of a work. psql or the SQL Editor runs the parts in order.

Input files are gzip-compressed JSON lines (content/classics/bulk-2026-11/works-*.jsonl.gz), one
work per line: {id, title, author, author_died, language, kind, category, rating, first_published,
blurb, source_title, source_url, chapters: [{title, body}], and for a translation
original_language, translator_name, translator_died_year, translation_rights}.
"""
import glob
import gzip
import json
import os
import secrets
import sys

# The Supabase SQL Editor takes about 0.5 MB per run, so each part stays under 450 KB.
PART_LIMIT_BYTES = 450_000
# Room left in a part for the loader function and the comments around the calls.
LOADER_ROOM_BYTES = 20_000
HERE = os.path.dirname(os.path.abspath(__file__))
DEFAULT_WORKS = os.path.join(HERE, "..", "..", "content", "classics", "bulk-2026-11", "works-*.jsonl.gz")


def dollar_quote(text):
    """Wrap text in a dollar-quote tag that does not appear inside it, so no escaping is needed.

    Input: any text. Returns: $wXXXXXXXX$text$wXXXXXXXX$, safe to paste into SQL.
    """
    while True:
        tag = "$w" + secrets.token_hex(4) + "$"
        if tag not in text:
            return f"{tag}{text}{tag}"


def read_works(paths):
    """Every work in the given JSON lines files, in file order.

    Input: a list of .jsonl.gz paths. Returns: a list of work dicts.
    Raises: FileNotFoundError when a path is missing, ValueError on a broken line.
    """
    works = []
    for path in paths:
        with gzip.open(path, "rt", encoding="utf-8") as lines:
            for number, line in enumerate(lines, 1):
                if not line.strip():
                    continue
                try:
                    works.append(json.loads(line))
                except json.JSONDecodeError as error:
                    raise ValueError(f"{path} line {number} is not valid JSON: {error}") from error
    return works


def pieces(work):
    """Cut one work into payloads that each fit in a part; a chapter is never cut here.

    Input: one work dict. Yields: the work's details plus some of its numbered chapters, with
    chapter_total so the loader knows when every chapter has arrived and the work can go live.
    """
    header = {key: value for key, value in work.items() if key not in ("chapters", "id")}
    header["chapter_total"] = len(work["chapters"])
    current, size = [], 0
    for position, chapter in enumerate(work["chapters"], 1):
        numbered = dict(position=position, **chapter)
        chapter_size = len(json.dumps(numbered, ensure_ascii=False).encode())
        # Start a new piece when this chapter would push the current one past the limit.
        if current and size + chapter_size > PART_LIMIT_BYTES - LOADER_ROOM_BYTES:
            yield dict(header, chapters=current)
            current, size = [], 0
        current.append(numbered)
        size += chapter_size
    if current:
        yield dict(header, chapters=current)


def group_into_parts(calls):
    """Pack (title, sql call) pairs into parts under the size limit, keeping their order."""
    parts, current, size = [], [], 0
    for title, call in calls:
        call_size = len(call.encode())
        if current and size + call_size > PART_LIMIT_BYTES - LOADER_ROOM_BYTES:
            parts.append(current)
            current, size = [], 0
        current.append((title, call))
        size += call_size
    if current:
        parts.append(current)
    return parts


def part_text(number, total, part, loader):
    """The full SQL of one part: a header comment, the loader, the calls and a check query."""
    titles = list(dict.fromkeys(title for title, _ in part))
    head = (
        f"-- Classics bulk load: part {number} of {total} ({len(titles)} works).\n"
        "-- Run the parts in order. Each part is safe to run twice.\n"
        f"-- Works: {'; '.join(titles)[:900]}\n\nbegin;\n"
        # Supabase stops a statement after 2 minutes; a long novel's chapters can take longer to
        # check and publish (part 298 of the 27 Nov load). This lifts it for this transaction only.
        "set local statement_timeout = 0;\n\n"
    )
    body = "".join(call for _, call in part)
    tail = (
        "\ncommit;\n\n-- Check: how many classics are live now.\n"
        "select count(*) as live_classics from public.stories\n"
        "join public.classic_works on classic_works.story_id = stories.id\n"
        "where stories.first_published_at is not null and stories.deleted_at is null;\n"
    )
    return head + loader + "\n" + body + tail


def main(arguments):
    """Write the parts. Input: <out_dir> [<works file> ...]. Returns: the process exit code."""
    if not arguments:
        print("Usage: build-load-sql.py <out_dir> [<works .jsonl.gz> ...]", file=sys.stderr)
        return 2
    out_dir = arguments[0]
    paths = arguments[1:] or sorted(glob.glob(DEFAULT_WORKS))
    if not paths:
        print("No works files found.", file=sys.stderr)
        return 1
    # Step 1: read the loader once; it goes at the top of every part.
    with open(os.path.join(HERE, "load-classic.sql"), encoding="utf-8") as loader_file:
        loader = loader_file.read()
    # Step 2: one SQL call per piece of every work.
    calls = []
    for work in read_works(paths):
        for piece in pieces(work):
            payload = json.dumps(piece, ensure_ascii=False)
            calls.append((work["title"], f"select pg_temp.load_classic({dollar_quote(payload)}::jsonb);\n"))
    # Step 3: pack the calls into parts and write them, numbered so they sort in run order.
    os.makedirs(out_dir, exist_ok=True)
    parts = group_into_parts(calls)
    for number, part in enumerate(parts, 1):
        with open(os.path.join(out_dir, f"part-{number:03d}.sql"), "w", encoding="utf-8") as out:
            out.write(part_text(number, len(parts), part, loader))
    print(f"{len(calls)} calls in {len(parts)} parts, written to {out_dir}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
