"""Shared helpers: HTML inline content to the chapter Markdown subset, and chapter splitting.

The app stores chapters as a Markdown subset (paragraphs, ## headings, *italic*, **bold**, > quotes,
lists, * * * scene breaks, line breaks as two spaces + newline). Raw HTML is refused by
check_chapter_text(), and a chapter holds at most 100,000 characters (setting chapter_max_characters).
"""
import re
from bs4 import NavigableString, Tag

MAX_CHAPTER_CHARACTERS = 95_000  # a margin under the database's 100,000

def escape_text(text):
    """Escape characters that would turn plain text into Markdown or look like HTML."""
    text = text.replace("\\", "\\\\")
    text = re.sub(r"([*_`\[\]<>])", r"\\\1", text)
    return text

def inline(node):
    """Turn an element's inline content into Markdown (italic, bold, line breaks; links lose their address)."""
    parts = []
    for child in node.children:
        if isinstance(child, NavigableString):
            if child.__class__.__name__ in ("Comment", "Doctype"): continue
            parts.append(escape_text(re.sub(r"\s+", " ", str(child))))
        elif isinstance(child, Tag):
            name = child.name
            types = child.get("epub:type", "")
            if name in ("sup", "script", "style") and ("noteref" in types or name != "sup"):
                continue
            if name == "a" and "noteref" in types: continue
            if name == "br":
                parts.append("  \n"); continue
            inner = inline(child)
            if name in ("i", "em", "cite") and inner.strip():
                leading = inner[:len(inner) - len(inner.lstrip())]; trailing = inner[len(inner.rstrip()):]
                parts.append(f"{leading}*{inner.strip()}*{trailing}")
            elif name in ("b", "strong") and inner.strip():
                parts.append(f"**{inner.strip()}**")
            else:
                parts.append(inner)
    return "".join(parts)

def tidy_paragraph(text):
    """Trim each line and drop empty lines inside one block."""
    lines = [line.strip() for line in text.split("  \n")]
    lines = [line for line in lines if line]
    joined = "  \n".join(lines)
    # A block must not start like a heading, list or quote by accident.
    joined = re.sub(r"^(#+|\d+\.|[-+])(\s)", r"\\\1\2", joined, flags=re.M)
    return joined.strip()

def split_long(title, body, part_word):
    """Split a chapter that is too long at paragraph breaks into numbered parts."""
    if len(body) <= MAX_CHAPTER_CHARACTERS:
        return [(title, body)]
    blocks = body.split("\n\n")
    pieces, current = [], []
    for block in blocks:
        if current and len("\n\n".join(current + [block])) > MAX_CHAPTER_CHARACTERS:
            pieces.append("\n\n".join(current)); current = []
        current.append(block)
    if current: pieces.append("\n\n".join(current))
    return [(f"{title} ({part_word} {number})"[:120], piece) for number, piece in enumerate(pieces, 1)]

GROUP_TARGET = 30_000

def group_small(chapters, separator=", "):
    """Join many tiny chapters (single poems, short scenes) into readable chapters of about 30,000 characters.

    First by shared prefix ("Book I, One's-Self I Sing" -> "Book I"); then, still small, in runs.
    Each original piece keeps its title as a ### heading inside the new chapter.
    """
    if len(chapters) <= 8 or sum(len(b) for _, b in chapters) / len(chapters) >= 5000:
        return chapters
    # By prefix, when most titles have one.
    prefixed = [t.rsplit(separator, 1) for t, _ in chapters]
    if sum(1 for p in prefixed if len(p) == 2) > len(chapters) * 0.8:
        groups = []
        for (title, body), parts in zip(chapters, prefixed):
            prefix, rest = (parts[0], parts[1]) if len(parts) == 2 else (title, "")
            if groups and groups[-1][0] == prefix: groups[-1][1].append((rest, body))
            else: groups.append((prefix, [(rest, body)]))
        if len(groups) < len(chapters) / 2:
            merged = []
            for prefix, pieces in groups:
                merged.extend(runs([(rest or prefix, body) for rest, body in pieces], prefix))
            return merged
    return runs(chapters, None)

def runs(pieces, prefix):
    """Pack pieces in order into chapters up to GROUP_TARGET characters."""
    out, current, size = [], [], 0
    def flush():
        if not current: return
        first, last = current[0][0], current[-1][0]
        if prefix: title = prefix if len(out) == 0 and pieces[-1] is current[-1] else f"{prefix}: {first} – {last}" if first != last else f"{prefix}: {first}"
        else: title = first if first == last else f"{first} – {last}"
        body = "\n\n".join(f"### {t}\n\n{b}" for t, b in current)
        out.append((title[:120], body))
    for title, body in pieces:
        if current and size + len(body) > GROUP_TARGET:
            flush(); current, size = [], 0
        current.append((title, body)); size += len(body)
    flush()
    return out
