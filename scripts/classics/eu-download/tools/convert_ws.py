"""Wikisource page view HTML -> chapters (CONTENT thread, 26 Nov 2026).

Keeps only the work's text, as content/classics/texts/README.md asks: the Wikisource header and its
notes, navigation tables, licence boxes, images, footnote markers and footnote sections are dropped,
so nothing Wikisource contributors wrote is kept. A single page is cut into chapters at its top
heading level; a work spread over subpages gets one chapter per subpage (the index page is skipped).
"""
import json, re, sys, warnings
from bs4 import BeautifulSoup, Tag, NavigableString, XMLParsedAsHTMLWarning
warnings.filterwarnings("ignore", category=XMLParsedAsHTMLWarning)
sys.path.insert(0, __import__("os").path.dirname(__file__))
from mdtools import inline, tidy_paragraph, split_long

DROP_SELECTORS = [".ws-noexport", ".wst-header", "#headertemplate", ".headertemplate", "table", "style",
    "link", "sup.reference", "sup", ".reference", "ol.references", ".mw-references-wrap", "#textquality",
    ".noprint", ".mw-editsection", "#ws-data", ".ws-pagenum", ".pagenum", "figure", "img", ".mw-empty-elt",
    ".thumb", ".gallery", ".navbox", ".metadata", ".licenseContainer", ".licence", ".mw-heading .mw-editsection",
    "script", ".catlinks", "#toc", ".toc", ".ws-summary", ".prp-pages-output > .pagetext-link", ".mw-cite-backlink"]
NOTE_HEADINGS = re.compile(r"^(note|note de subsol|referințe|referinte|bibliografie|notes|references|footnotes|"
                           r"fodnoter|noter|anmärkningar|noter och kommentarer|kilder|källor|vezi și|примечания|комментарии|сноски|"
                           r"przypisy|uwagi|anmerkungen|fußnoten|fussnoten|einzelnachweise|notas|nota|noten|voetnoten|"
                           r"aantekeningen|notes de l'éditeur|commentaires|см\. также|ссылки|декламация|zobacz też|linki zewnętrzne|"
                           r"voir aussi|liens externes|siehe auch|weblinks|véase también|enlaces externos|vedi anche|"
                           r"collegamenti esterni|ver também|ligações externas|zie ook|externe links)(?!\w)", re.I)
CAST_LIST = re.compile(r"^(personaj|persoane|persoanele|personajele|personer|personerne|personene|personerna|dramatis)", re.I)
HEADINGS = ["h1", "h2", "h3", "h4", "h5", "h6"]

def unwrap_verse_tables(soup):
    """Swedish Wikisource sets many poems in a layout table (class "dikttabell"), sometimes
    with the verse in one cell and a translation or melody note in another. Tables are
    otherwise dropped as navigation, so a table that holds verse becomes plain divs first:
    each cell in reading order, so the poem survives."""
    for table in soup.find_all("table"):
        classes = " ".join(table.get("class", []))
        if "dikt" not in classes and not table.select(".poem"):
            continue
        holder = soup.new_tag("div")
        # Only this table's own cells: a cell holding a nested table keeps its whole content
        # (a page laid out in one big table holds the verse beside small nested tables, and
        # skipping that cell lost whole chapters). Nested tables are unwrapped or dropped later.
        for cell in table.find_all(["td", "th"]):
            if cell.find_parent("table") is not table:
                continue
            block = soup.new_tag("div")
            for child in list(cell.children):
                block.append(child.extract())
            holder.append(block)
        table.replace_with(holder)

def drop_line_numbers(soup):
    """Verse line numbers ("5", "10", "30") printed beside a poem are the editor's, not the
    author's: a span holding only a number, floated to the margin or carrying the number as
    its id (pl.wikisource), is dropped so the number doesn't start a line of the poem."""
    for span in soup.find_all("span"):
        number = span.get_text().replace("\xa0", " ").strip()
        if not number.isdigit():
            continue
        style = span.get("style", "").replace(" ", "").lower()
        if "float:right" in style or "float:left" in style or span.get("id") == number:
            span.decompose()

def clean(html):
    soup = BeautifulSoup(html, "lxml")
    unwrap_verse_tables(soup)
    drop_line_numbers(soup)
    for selector in DROP_SELECTORS:
        for node in soup.select(selector): node.decompose()
    return soup

def poem_blocks(div):
    """A <div class=poem>: stanzas are <p> (or <br><br> runs); each line ends with a line break."""
    text = inline(div)
    stanzas = re.split(r"(?:\s*  \n\s*){2,}|\n\s*\n", text)
    out = []
    for stanza in stanzas:
        lines = [line.strip() for line in re.split(r"  \n|\n", stanza)]
        lines = [l for l in lines if l]
        if lines: out.append("  \n".join(lines))
    return out

def heading_text(node):
    """A heading's words, without a footnote number stuck to the last word ("Апрель1")."""
    text = " ".join(node.get_text(" ").split())
    return re.sub(r"(?<=[^\W\d_])\d{1,2}$", "", text)

def walk(node, items):
    """Flatten the content into ('heading', level, text) and ('block', markdown) items in order."""
    for child in node.children:
        if isinstance(child, NavigableString):
            text = str(child).strip()
            if text and child.__class__.__name__ not in ("Comment",): items.append(("block", tidy_paragraph(inline_text(text))))
            continue
        if not isinstance(child, Tag): continue
        name, classes = child.name, child.get("class", [])
        if name in HEADINGS:
            items.append(("heading", int(name[1]), heading_text(child))); continue
        if name == "div" and "mw-heading" in classes:
            heading = child.find(HEADINGS)
            if heading: items.append(("heading", int(heading.name[1]), heading_text(heading)))
            continue
        if "poem" in classes:
            items.extend(("block", b) for b in poem_blocks(child)); continue
        if name == "p":
            text = tidy_paragraph(inline(child))
            if text: items.append(("block", text))
        elif name == "hr":
            items.append(("block", "* * *"))
        elif name in ("ul", "ol"):
            for li in child.find_all("li", recursive=False):
                text = tidy_paragraph(inline(li))
                if text: items.append(("block", text))
        elif name in ("dl",):
            for part in child.find_all(["dt", "dd"]):
                if part.find(["dl", "p", "div"]): continue
                text = tidy_paragraph(inline(part))
                if text: items.append(("block", f"**{text}**" if part.name == "dt" else text))
        elif name in ("div", "section", "center", "blockquote", "span", "main", "article", "body", "html", "font", "big", "small"):
            if name == "span" and not child.find(["p", "div", "br"]):
                text = tidy_paragraph(inline(child))
                if text: items.append(("block", text))
                continue
            walk(child, items)
        elif name in ("i", "b", "em", "strong", "a", "u", "s"):
            text = tidy_paragraph(inline(child))
            if text: items.append(("block", text))
        elif name == "br":
            continue
    return items

def inline_text(text):
    from mdtools import escape_text
    return escape_text(re.sub(r"\s+", " ", text))

def merge_loose(items):
    """Join runs of short loose fragments (text split around <br> outside <p>) into paragraphs."""
    return [i for i in items if i[0] == "heading" or i[1].strip()]

def page_items(html):
    soup = clean(html)
    root = soup.select_one(".mw-parser-output") or soup.body
    items = merge_loose(walk(root, []))
    # Stop at the first notes/references heading.
    for index, item in enumerate(items):
        if item[0] == "heading" and NOTE_HEADINGS.match(item[2]):
            return items[:index]
    return items

def chapters_from_items(items, fallback_title):
    levels = [i[1] for i in items if i[0] == "heading"]
    top = min(levels) if levels else None
    chapters, title, blocks = [], fallback_title, []
    for item in items:
        if item[0] == "heading" and item[1] == top:
            if blocks: chapters.append((title, "\n\n".join(blocks)))
            title, blocks = item[2] or fallback_title, []
        elif item[0] == "heading":
            blocks.append(f"### {item[2]}" if item[2] else "")
        else:
            blocks.append(item[1])
    if blocks: chapters.append((title, "\n\n".join(b for b in blocks if b)))
    # A short opening before the first heading (a motto, a dedication) joins the first chapter.
    if len(chapters) > 1 and chapters[0][0] == fallback_title and len(chapters[0][1]) < 1500:
        chapters[1] = (chapters[1][0], chapters[0][1] + "\n\n" + chapters[1][1]); chapters.pop(0)
    # A play's cast list ("Personajele") goes at the top of the first act, under its own small heading.
    if len(chapters) > 1 and CAST_LIST.match(chapters[0][0]) and len(chapters[0][1]) < 5000:
        chapters[1] = (chapters[1][0], f"### {chapters[0][0]}\n\n{chapters[0][1]}\n\n* * *\n\n{chapters[1][1]}"); chapters.pop(0)
    # One chapter only: it takes the work's title.
    if len(chapters) == 1:
        chapters[0] = (fallback_title, (f"### {chapters[0][0]}\n\n" if CAST_LIST.match(chapters[0][0]) else "") + chapters[0][1])
    return chapters

# Subpages written by editors, not the author: notes, commentaries, editors' introductions (27 Nov 2026).
EDITOR_PAGES = re.compile(r"^(примечани|комментари|сноски|от редакц|вступительная статья|przypisy|wstęp|"
                          r"od wydawcy|przedmowa wydawcy|einleitung|anmerkungen|nachwort des herausgebers|"
                          r"introduction|notes|notice|avertissement de l'éditeur|introducción|notas|nota del editor|"
                          r"introduzione|note|nota dell'editore|introdução|notas do editor|inleiding|aantekeningen|"
                          r"noten|index|inhalt|spis treści|содержание|оглавление|table des matières|índice|indice)", re.I)

def is_index_page(sub, all_titles, items):
    """A subpage that only lists its own subpages (Том I), which are fetched on their own."""
    has_children = any(t.startswith(sub["title"] + "/") for t in all_titles)
    text = sum(len(i[1]) for i in items if i[0] == "block")
    return has_children and text < 4000

VOLUME_TITLES = re.compile(r"^(tom|volume|vol\.|band|tome|tomo|deel|том|часть)\s+[\divxlc]+\b", re.I)

def is_volume_title_page(sub, items):
    """A volume's title page ("Tom I": the printer, the year, the subscribers' list) holds no
    text of the author's; a short subpage named only for its volume is skipped."""
    name = sub["title"].split("/")[-1].strip()
    letters = sum(len(re.sub(r"\W", "", i[1])) for i in items if i[0] == "block")
    return bool(VOLUME_TITLES.match(name)) and letters < 400

def convert(record, work_title, part_word="partea"):
    chapters = []
    if record.get("subpages"):
        all_titles = [s["title"] for s in record["subpages"]]
        for sub in record["subpages"]:
            if EDITOR_PAGES.match(sub["title"].split("/")[-1].strip()): continue
            items = page_items(sub["html"])
            if is_index_page(sub, all_titles, items): continue
            if not any(i[0] == "block" for i in items): continue
            if is_volume_title_page(sub, items): continue
            sub_title = re.sub(r"(?<=[^\W\d_])(\d{1,2})$", r" \1", sub["title"].split("/")[-1].strip())
            sub_chapters = chapters_from_items(items, sub_title)
            if len(sub_chapters) == 1 or sum(len(c[1]) for c in sub_chapters) < 20000:
                body = "\n\n".join((f"### {t}\n\n{b}" if t != sub_title and i > 0 else b) for i, (t, b) in enumerate(sub_chapters))
                chapters.append((sub_title, body))
            else:
                chapters.extend((f"{sub_title}, {t}" if t != sub_title else t, b) for t, b in sub_chapters)
    else:
        chapters = chapters_from_items(page_items(record["html"]), work_title)
    out = []
    for title, body in chapters:
        # A broken template on the source page shows only its name ("Format:Poem"); drop it.
        body = re.sub(r"\n*^Format:\w+$\n*", "\n\n", body, flags=re.M).strip()
        # Unresolved relative links from navigation ("[[../Глава II|Глава II]]") are not text.
        body = re.sub(r"\[\[\.\./[^\]]*\]\]\s*(?:→)?", "", body).strip()
        # A row of stars typed in the source is a scene break, not escaped text.
        body = re.sub(r"^(?:\\\* ?){3}$", "* * *", body, flags=re.M)
        # A <poem> tag typed wrongly in the source shows as text ("\\</poem\\>"); drop it.
        body = re.sub(r"\\?</?\s*poem\s*\\?>", "", body, flags=re.I)
        if body: out.extend(split_long(title[:120], body, part_word))
    return out

def edition_year(record):
    match = re.search(r'id="header-year-text"[^>]*>\s*(\d{4})', record.get("html", ""))
    return int(match.group(1)) if match else None

if __name__ == "__main__":
    record = json.load(open(sys.argv[1]))
    for title, body in convert(record, sys.argv[2]):
        print("=====", title, len(body)); print(body[:int(sys.argv[3]) if len(sys.argv) > 3 else 400])
