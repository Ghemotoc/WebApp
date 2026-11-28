"""Build the pack of classics that are free in most countries but still protected in a few.

Robert, 27 Nov 2026: add Orwell and Peter Pan, hidden only where they are still under copyright.
Each work carries hidden_in_countries, which the loader (scripts/classics/load-classic.sql,
Step 3b) writes to stories.hidden_in_countries before any chapter is published (COUNTRY-1).

Sources:
- Orwell: Project Gutenberg Australia HTML (public domain in Australia; texts are plain
  transcriptions). Downloaded by hand into orwell/raw/<number>.html.
- Peter Pan: Standard Ebooks (CC0) single-page HTML, converted by convert_se.py.

Usage: python3 -I build_hidden_pack.py <out.jsonl.gz>
It ran in a scratch folder beside mdtools.py (../eu-download/tools/mdtools.py) and the CONTENT
thread's convert_se.py, with the downloads in orwell/raw/; it is kept here as the record of how
content/classics/bulk-2026-11/works-hidden.jsonl.gz was made.
"""
import gzip, json, os, re, sys, warnings
from bs4 import BeautifulSoup, Tag, XMLParsedAsHTMLWarning

warnings.filterwarnings("ignore", category=XMLParsedAsHTMLWarning)
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from mdtools import inline, tidy_paragraph, split_long, MAX_CHAPTER_CHARACTERS  # noqa: E402
import convert_se  # noqa: E402

BASE = os.path.dirname(HERE)
RAW = os.path.join(BASE, "orwell", "raw")

# Where each is still protected (checked 27 Nov 2026; the reasons are in the decision log):
# - Orwell died 1950: free where the term is life + 70 or shorter. Still protected in the United
#   States and its territories (95 years from publication for 1933 onwards), in Spain (life + 80
#   for authors who died before 7 Dec 1987), Mexico (life + 100), Colombia (life + 80) and
#   Côte d'Ivoire (life + 99).
# - Peter Pan: the United Kingdom's perpetual royalty right for Great Ormond Street Hospital
#   (CDPA 1988, s. 301 and Schedule 6), plus the Crown dependencies to be safe.
ORWELL_HIDDEN = ["US", "PR", "GU", "VI", "AS", "MP", "UM", "ES", "MX", "CO", "CI"]
PETER_PAN_HIDDEN = ["GB", "IM", "JE", "GG"]

ORWELL = [
    # number, title, year, kind, category, rating, blurb
    ("0100021", "Nineteen Eighty-Four", 1949, "novel", "fiction", "16_plus",
     "In a state that watches every face and rewrites every record, Winston Smith starts a secret diary and a forbidden love affair."),
    ("0100011", "Animal Farm", 1945, "novel", "fiction", "all_ages",
     "The animals of Manor Farm drive out their farmer to run the farm as equals, until the pigs decide some animals are more equal than others."),
    ("0200051", "Burmese Days", 1934, "novel", "fiction", "16_plus",
     "In a small town in colonial Burma, a lonely timber merchant is caught between a scheming magistrate, the English club and a woman he hopes will save him."),
    ("0200011", "A Clergyman's Daughter", 1935, "novel", "fiction", "13_plus",
     "A rector's dutiful daughter loses her memory and wakes on a London street, then lives as a hop-picker, a homeless woman and a teacher."),
    ("0200021", "Keep the Aspidistra Flying", 1936, "novel", "fiction", "16_plus",
     "A would-be poet in a London bookshop declares war on money and respectability, and finds both harder to escape than he thought."),
    ("0200031", "Coming Up for Air", 1939, "novel", "fiction", "16_plus",
     "On the eve of war, a middle-aged insurance salesman sneaks back to the country town of his boyhood to see if anything of it is left."),
    ("0100171", "Down and Out in Paris and London", 1933, "essay", "nonfiction_essays", "16_plus",
     "Orwell's own account of washing dishes in Paris hotel kitchens and tramping between London's lodging houses with no money at all."),
    ("0200391", "The Road to Wigan Pier", 1937, "essay", "nonfiction_essays", "13_plus",
     "Orwell goes down the coal mines and into the crowded homes of northern England, then asks why so many people distrust socialism."),
    ("0201111", "Homage to Catalonia", 1938, "essay", "nonfiction_essays", "16_plus",
     "Orwell's account of fighting in the Spanish Civil War with a militia in Catalonia, being shot in the throat and escaping the purge of his comrades."),
]

PART_HEADING = re.compile(r"^(part|book)\b", re.I)
STARS = re.compile(r"^[\s*]+$")


ROMAN = re.compile(r"^[IVXLC]+$")


def nice_title(text):
    """'PART TWO' -> 'Part Two' and '12' -> 'Chapter 12', leaving Roman numerals in capitals."""
    text = text.rstrip(".")
    if text.isdigit() or ROMAN.match(text):
        return "Chapter " + text
    if text.isupper():
        return " ".join(word if ROMAN.match(word) else word.capitalize() for word in text.split())
    return text


def flat_blocks(body):
    """Every block-level element of the body in reading order, without the wrappers around them."""
    for child in body.children:
        if not isinstance(child, Tag):
            continue
        if child.name in ("div", "center", "span"):
            yield from flat_blocks(child)
        else:
            yield child


def pre_lines(node):
    """A song or verse set as <pre>: one line each, kept as hard line breaks."""
    lines = [line.strip() for line in node.get_text().split("\n")]
    stanzas, current = [], []
    for line in lines:
        if line:
            current.append(line)
        elif current:
            stanzas.append(current); current = []
    if current:
        stanzas.append(current)
    return ["  \n".join(tidy_paragraph(line) for line in stanza) for stanza in stanzas]


class Chapters:
    """Collects chapters: a title and a list of Markdown blocks each."""

    def __init__(self):
        self.items, self.part = [], ""

    def start(self, title):
        full = f"{self.part}, {title}" if self.part else title
        self.items.append([full, []])

    def add(self, block):
        if self.items and block.strip():
            self.items[-1][1].append(block)


def orwell_chapters(path):
    """Turn one Gutenberg Australia HTML book into (title, body) chapters."""
    soup = BeautifulSoup(open(path, encoding="latin-1").read(), "lxml")
    chapters = Chapters()
    started = False
    for node in flat_blocks(soup.body):
        text = re.sub(r"\s+", " ", node.get_text()).strip()
        is_heading = re.fullmatch(r"h[1-6]", node.name or "") is not None
        # Step 1: a heading with the "chN" anchor starts a chapter; part headings set a prefix.
        if is_heading and node.find("a", attrs={"name": re.compile(r"^ch\d+$")}):
            started = True
            if text.upper().startswith("APPENDIX"):
                chapters.part = ""  # the appendix belongs to no part
            chapters.start(nice_title(text))
            continue
        if is_heading and PART_HEADING.match(text):
            chapters.part = nice_title(text)
            continue
        if not started:
            continue  # the site's header, the title page and the contents list
        # Step 2: the end of the book; the site's footer follows it.
        if is_heading and text.upper().startswith("THE END"):
            break
        if is_heading and STARS.match(text):
            chapters.add("* * *")
            continue
        if is_heading:
            # A subtitle straight under a chapter heading joins its title; later ones are headings.
            if chapters.items and not chapters.items[-1][1]:
                chapters.items[-1][0] += ": " + text
            else:
                chapters.add("### " + tidy_paragraph(inline(node)))
            continue
        # Step 3: the text itself.
        if node.name == "p" and (text.isdigit() or ROMAN.match(text)):
            chapters.add("### " + text)  # a numbered section inside a chapter
        elif node.name == "p":
            chapters.add(tidy_paragraph(inline(node)))
        elif node.name == "pre":
            for stanza in pre_lines(node):
                chapters.add(stanza)
        elif node.name == "blockquote":
            for paragraph in node.find_all("p") or [node]:
                chapters.add("> " + tidy_paragraph(inline(paragraph)).replace("  \n", "  \n> "))
        elif node.name == "hr":
            continue  # a rule between chapters, not a scene break
        elif node.name in ("ul", "ol"):
            for item in node.find_all("li"):
                chapters.add("- " + tidy_paragraph(inline(item)))
        elif text:
            raise SystemExit(f"{os.path.basename(path)}: unexpected <{node.name}>: {text[:80]}")
    result = []
    for title, blocks in chapters.items:
        while blocks and blocks[-1] == "* * *":
            blocks.pop()  # a scene break that only closes a chapter
        result.extend(split_long(title[:120], "\n\n".join(blocks), "part"))
    return result


def check(work):
    """Stop on anything the database would refuse or that looks broken."""
    assert work["chapters"], work["id"]
    for title, body in ((c["title"], c["body"]) for c in work["chapters"]):
        assert body.strip(), f"{work['id']}: empty chapter {title}"
        assert len(body) <= 100_000, f"{work['id']}: {title} has {len(body)} characters"
        assert not re.search(r"<\s*[a-z/!]", body), f"{work['id']}: raw HTML in {title}"
        assert "Gutenberg" not in body, f"{work['id']}: site text in {title}"


def main(out_path):
    works = []
    for number, title, year, kind, category, rating, blurb in ORWELL:
        chapters = orwell_chapters(os.path.join(RAW, number + ".html"))
        works.append(dict(id="en-" + re.sub(r"[^a-z0-9]+", "-", title.lower().replace("'", "")).strip("-"), title=title,
                          author="George Orwell", author_died=1950, language="en", kind=kind,
                          category=category, rating=rating, first_published=year, blurb=blurb,
                          source_title="Project Gutenberg Australia",
                          source_url=f"https://gutenberg.net.au/ebooks{number[:2]}/{number}h.html",
                          hidden_in_countries=ORWELL_HIDDEN,
                          chapters=[dict(title=t, body=b) for t, b in chapters]))
    peter = convert_se.convert(os.path.join(BASE, "orwell", "raw", "peter-and-wendy.html"), "Peter and Wendy")
    works.append(dict(id="en-peter-and-wendy", title="Peter and Wendy", author="J. M. Barrie", author_died=1937,
                      language="en", kind="novel", category="fiction", rating="all_ages", first_published=1911,
                      blurb="Peter Pan, the boy who would not grow up, flies Wendy and her brothers to Neverland, "
                            "where Captain Hook and his pirates are waiting.",
                      source_title="Standard Ebooks (CC0)",
                      source_url="https://standardebooks.org/ebooks/j-m-barrie/peter-and-wendy",
                      hidden_in_countries=PETER_PAN_HIDDEN,
                      chapters=[dict(title=t, body=b) for t, b in peter]))
    for work in works:
        check(work)
        sizes = [len(c["body"]) for c in work["chapters"]]
        print(f"{work['id']}: {len(sizes)} chapters, {sum(sizes):,} characters, longest {max(sizes):,}; "
              f"first: {work['chapters'][0]['title']!r}, last: {work['chapters'][-1]['title']!r}")
    with gzip.open(out_path, "wt", encoding="utf-8") as out:
        for work in works:
            out.write(json.dumps(work, ensure_ascii=False) + "\n")


if __name__ == "__main__":
    main(sys.argv[1])
