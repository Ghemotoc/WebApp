"""Build one work JSON per downloaded European classic (CONTENT thread, 27 Nov 2026).

Usage: build_eu.py <lang> [<lang> ...]. Reads eu/rows.json (the research list), raw/eu/<lang>/*.json
(the Wikisource pages) and eu/meta/<lang>.tsv (id, rating, blurb written for this load), and writes
works_eu/<id>.json plus works_eu/_report_<lang>.json (built, too short, missing).
Rules: only the author's text (convert_ws drops notes, editors' pages and Wikisource's own header);
Russian pre-1918 spelling is brought to modern spelling where no modern copy exists, and the credit says so.
"""
import csv, json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import convert_ws

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KIND = {"novel": "novel", "novella": "novel", "poetry": "poem", "poem": "poem", "epic": "poem", "play": "play",
        "short stories": "short_story", "children": "novel", "folk tales": "fairy_tale", "essay": "essay"}
CATEGORY_OF_KIND = {"poem": "poetry", "essay": "nonfiction_essays"}
PART_WORD = {"ru": "часть", "pl": "część", "fr": "partie", "de": "Teil", "es": "parte", "it": "parte", "pt": "parte", "nl": "deel"}
# "Formatting adapted" in each language, after the CC BY-SA credit.
ADAPTED = {"ru": "оформление изменено", "pl": "formatowanie dostosowane", "fr": "mise en forme adaptée",
           "de": "Formatierung angepasst", "es": "formato adaptado", "it": "formattazione adattata",
           "pt": "formatação adaptada", "nl": "opmaak aangepast"}
MODERN_SPELLING = "оформление и дореформенная орфография изменены"
DROP_SUBPAGES = re.compile(r"^(ДО|Весь текст|Полный текст|Full text|Texte entier|Texte intégral|Volltext|Gesamttext|"
                           r"całość|cały tekst|tekst całości|texto completo|texto integral|testo completo|"
                           r"testo integrale|volledige tekst)$", re.I)
# Wikisource's licence line at the foot of a page ("Tekst jest własnością publiczną ..."), not the author's text.
LICENCE_LINE = re.compile(r"^.{0,80}(własnością publiczną|public domain|domaine public|gemeinfrei|dominio p[úu]blico|"
                          r"pubblico dominio|dom[íi]nio p[úu]blico|publiek domein|общественным достоянием|"
                          r"общественное достояние).{0,220}$\n?", re.I | re.M)

# Lines that name where the text came from, not the author's words: a scan note, a source or
# "original here" line, an illustrator credit, a collected-works reference, a printer's imprint.
SOURCE_LINE = re.compile(r"^\**\s*(Источник( текста)?\s*:|Оригинал здесь|Иллюстрации художника|Skan zawiera grafikę|"
                         r"Издательство\s|Тип\.\s|Типография\s|Р\. Ц\.|Тираж\s|Prim\.?$|Впервые[:\s]|#*\s*={5,}|"
                         r"(М|Л|СПб|Мн|М\., Л)\.,?:? .{0,60}\d{4}[;.)]?\s*(\(.*\))?$)|"
                         r"Собрание сочинений в \d|Избранные произведения в \d|Полное собрание сочинений в \d|"
                         r"Эл\. версия|Корректура .{0,40}выполнена|печатается по тексту|опубликован впервые|впервые опубликован|"
                         r"/ Сост\.|послесл\.|\d+ с\.,? ил\.|— \d+ с\. —", re.I)
# A heading that opens an editor's notes or commentary: everything from it to the chapter's end goes.
NOTES_HEADING = re.compile(r"^#+\s*\**\s*(Примечани|Комментари|Варианты|Przypis|Objaśnieni|Notes?\b|Anmerkung|Erläuterung|"
                           r"Note\b|Notas?\b|Aantekening|Toelichting)", re.I)
NOTES_START = re.compile(r"^(Prim\.?|ст\. \d)", re.I)
# A heading that opens a short word from the editors ("От редакции"): it goes up to the next heading.
# Only a magazine's own word ("От редакции"): an "editor's" or "publisher's" foreword in a novel
# (Pushkin's Belkin, Laclos) is often the author's fiction, so those stay.
EDITOR_HEADING = re.compile(r"^#+\s*\**\s*(От редакции|Od redakcji|Nota della redazione|Note de la rédaction|"
                            r"Anmerkung der Redaktion|Nota de la redacción)", re.I)
# Leftovers of a page's contents list: bare numbers, roman numerals, "•" or "I · II · III".
NUMERALS_ONLY = re.compile(r"^[\s\d:.*•·IVXLC]*$")
# A chapter that is an edition's variant readings or notes, not the work.
NOTES_TITLE = re.compile(r"^(Печатные варианты|Варианты|Примечани|Комментари|Przypisy|Objaśnienia|Notes?$|Anmerkungen|"
                         r"Notas?$|Aantekeningen)", re.I)

def fix_wiki_leftovers(body):
    """Templates typed wrongly in the source show as text ("{Razr|Name}}", "{{indent|2|"): keep their words."""
    body = body.replace("{{подст:ударение}}", "́")
    body = re.sub(r"\{\{?\s*(?:razr|rem|indent\|\d+|bold|i|lang\|\w+)\|", "", body, flags=re.I)
    return body.replace("}}", "")

def only_authors_text(body):
    """Drop what an editor or the source added inside a chapter: source lines, notes to the end,
    an editors' foreword, and a leading run of bare numbers (a contents list's leftovers)."""
    kept, skipping_editor = [], False
    for paragraph in fix_wiki_leftovers(body).split("\n\n"):
        line = paragraph.strip()
        if NOTES_HEADING.match(line) or NOTES_START.match(line): break
        if EDITOR_HEADING.match(line): skipping_editor = True; continue
        if skipping_editor and line.startswith("#"): skipping_editor = False
        if skipping_editor or SOURCE_LINE.search(line): continue
        if not kept and (NUMERALS_ONLY.match(line) or line in ("Примечания", "Przypisy", "Notes")): continue
        # A poem's number in a collected edition ("\\340. БОРОДИНО") isn't part of its title.
        if not kept: paragraph = re.sub(r"^\\?\d{2,4}\. (?=\S)", "", paragraph)
        kept.append(paragraph)
    while kept and kept[-1].strip() in ("* * *", "\\* \\* \\*", "***", "* * * *"): kept.pop()
    return "\n\n".join(kept).strip()

def page_did_not_render(body):
    """A page Wikisource couldn't draw ("template include size too large") shows only its own name."""
    return len(body) < 400 and bool(re.match(r"^[^\n]*\([^()\n]+\)/[^\n]*$", body.strip()))

def paragraphs(body):
    """The longer paragraphs of a chapter, used to spot a chapter that repeats others."""
    return {p.strip() for p in body.split("\n\n") if len(p.strip()) > 80}

def drop_repeats(chapters):
    """Drop a chapter whose text mostly repeats other chapters (a "whole text" page next to the
    chapter pages): the longest such chapter goes first, until none repeats the rest."""
    chapters = list(chapters)
    while len(chapters) > 1:
        sets = [paragraphs(body) for _, body in chapters]
        repeated = []
        for index, own in enumerate(sets):
            if len(own) < 3: continue
            others = set().union(*(sets[:index] + sets[index + 1:]))
            if len(own & others) / len(own) >= 0.6: repeated.append(index)
        if not repeated: break
        longest = max(repeated, key=lambda i: len(chapters[i][1]))
        del chapters[longest]
    return chapters
LATE_TITLES = re.compile(r"^(Эпилог|Epilog|Épilogue|Epilogue|Epílogo|Epilogo|Epiloog)\b", re.I)

def modern_russian(text):
    """Bring pre-1918 Russian spelling to modern spelling (the 1918 reform's letter changes)."""
    if not re.search(r"[ѣѢіІѳѲѵѴ]", text): return text, False
    text = text.replace("ѣ", "е").replace("Ѣ", "Е").replace("і", "и").replace("І", "И")
    text = text.replace("ѳ", "ф").replace("Ѳ", "Ф").replace("ѵ", "и").replace("Ѵ", "И")
    text = re.sub(r"(?<=[бвгджзклмнпрстфхцчшщБВГДЖЗКЛМНПРСТФХЦЧШЩ])[ъЪ](?![а-яёА-ЯЁ])", "", text)
    return text, True

def chapters_of(record, title, language):
    record = dict(record)
    subs = record.get("subpages", [])
    # A "whole text" page goes only when the chapter pages are there too (Treny has only "Całość").
    kept = [s for s in subs if not DROP_SUBPAGES.match(s["title"].split("/")[-1].strip())]
    if kept: subs = kept
    # Old-spelling copies under ".../ДО/..." go when a modern copy of the work is there too.
    if any("/ДО/" not in s["title"] for s in subs):
        subs = [s for s in subs if "/ДО/" not in s["title"]]
    # Pages fetched from a contents list carry the author in brackets ("Ворона и Лисица (Крылов)").
    if record.get("listed"):
        subs = [dict(s, title=re.sub(r"\s*\([^()]*\)$", "", s["title"].split("/")[-1])) for s in subs]
    record["subpages"] = subs
    chapters = convert_ws.convert(record, title, PART_WORD.get(language, "part"))
    if any(page_did_not_render(b) for _, b in chapters):
        return None, False
    chapters = [(t, only_authors_text(LICENCE_LINE.sub("", b))) for t, b in chapters]
    chapters = [(t, b) for t, b in chapters if not NUMERALS_ONLY.match(b) and not NOTES_TITLE.match(t.strip())]
    chapters = [(t, b) for t, b in chapters if not b.lstrip().upper().startswith("ВАРИАНТЫ ТЕКСТА")]
    chapters = drop_repeats([(t, b) for t, b in chapters if b])
    # An epilogue linked first (from the page header) belongs at the end.
    if len(chapters) > 2 and LATE_TITLES.match(chapters[0][0]):
        chapters = chapters[1:] + chapters[:1]
    modernised = False
    if language == "ru":
        fixed = []
        for chapter_title, body in chapters:
            body, changed_body = modern_russian(body)
            # Notes headings in the old spelling ("Примѣчанія") only match once modernised.
            if changed_body: body = only_authors_text(body)
            chapter_title, changed_title = modern_russian(chapter_title)
            modernised = modernised or changed_body or changed_title
            fixed.append((chapter_title, body))
        chapters = fixed
    return chapters, modernised

def safe_text(text):
    """Escape a "<" that would read as an HTML tag ("<III>"), so the site's check_chapter_text() takes it (rule 8)."""
    # Wikisource's own error lines ("Ошибка цитирования: ...") are not the author's text.
    text = re.sub(r"^.*(?:Ошибка цитирования|Cite error|Błąd rozszerzenia cite|Erreur de référence|Fehler bei Referenz|Error en la cita|Errore nell'uso del tag|Erro de citação).*$\n?", "", text, flags=re.M)
    # Leave a "<" that is already escaped ("\\<мире\\>", an editor's conjecture) as it is.
    return re.sub(r"(?<!\\)<(?=[^\W\d_]|[/!?])", r"\\<", text)

def link_share(html):
    """How much of a page's text sits inside links, once the header and notes are dropped."""
    from bs4 import BeautifulSoup
    soup = convert_ws.clean(html)
    root = soup.select_one(".mw-parser-output") or soup
    total = len(root.get_text(" ", strip=True)) or 1
    linked = sum(len(a.get_text(" ", strip=True)) for a in root.select("a"))
    return linked / total

# Works checked by hand and held back: what came out isn't the work (CONTENT thread, 27 Nov 2026).
HELD_BACK = {
    "ru-poems": "only poem titles and anthology references came out, not the poems",
    "ru-evening-lights": "only the contents list came out, not the poems",
    "ru-let-us-be-like-the-sun": "only the contents list came out, not the poems",
    "ru-poems-in-prose": "only the contents list came out, not the poems",
    "ru-evenings-on-a-farm-near-dikanka": "only the preface and the glossary came out, not the eight stories",
    "ru-red-cavalry": "only the first few stories of the cycle came out",
    "ru-the-little-humpbacked-horse": "only the 1834 magazine printing of part one came out, with the editor's word",
}
# Where a work's own text starts, when the page opens with a modern edition's front matter (editor's
# word, contents, imprint), and where it ends, when a modern note follows it.
START_AT = {
    "ru-notes-of-a-schoolgirl": "Моим дорогим подругам",
    "ru-years-of-childhood": "Внучке моей Ольге",
}
CUT_FROM = {
    "ru-the-tale-of-the-dead-princess-and-the-seven-knight": "«Сказка о мертвой царевне и семи богатырях» — одна",
}

def trim_ends(work_id, chapters):
    """Apply START_AT and CUT_FROM for one work; checked by hand in the CONTENT thread."""
    chapters = list(chapters)
    if work_id in START_AT:
        title, body = chapters[0]
        at = body.find(START_AT[work_id])
        if at < 0: raise SystemExit(f"{work_id}: START_AT text not found")
        chapters[0] = (title, body[at:])
    if work_id in CUT_FROM:
        title, body = chapters[-1]
        at = body.find(CUT_FROM[work_id])
        if at < 0: raise SystemExit(f"{work_id}: CUT_FROM text not found")
        body = body[:at].rstrip()
        while body.endswith("* * *"): body = body[:-5].rstrip()
        chapters[-1] = (title, body)
    return chapters

def main(languages):
    out_dir = os.path.join(BASE, "works_eu"); os.makedirs(out_dir, exist_ok=True)
    rows = json.load(open(os.path.join(BASE, "eu/rows.json")))
    for language in languages:
        meta_path = os.path.join(BASE, "eu/meta", language + ".tsv")
        meta = {}
        if os.path.exists(meta_path):
            for line in open(meta_path, encoding="utf-8"):
                if line.strip() and not line.startswith("#"):
                    work_id, rating, blurb = line.rstrip("\n").split("\t")[:3]
                    meta[work_id] = (rating, blurb)
        report = {"built": [], "short": [], "missing": [], "no_meta": []}
        for work_id, host, page, author, row in rows[language]:
            raw = os.path.join(BASE, "raw/eu", language, work_id + ".json")
            if not os.path.exists(raw): report["missing"].append([work_id, "not downloaded yet"]); continue
            if work_id in HELD_BACK: report["short"].append([work_id, "held back: " + HELD_BACK[work_id]]); continue
            record = json.load(open(raw))
            if record.get("missing"):
                report["missing"].append([work_id, "scan index only" if record.get("scan_index") else "page not found"]); continue
            title = row["title_original"].strip()
            # A contents page that only links to other pages (Крылов's Басни): fetch those pages first.
            if not record.get("subpages") and not record.get("listed") and link_share(record["html"]) > 0.5:
                report["short"].append([work_id, "contents page", record["title"]]); continue
            chapters, modernised = chapters_of(record, title, language)
            if chapters is None: report["short"].append([work_id, "a page did not render on Wikisource", record["title"]]); continue
            if not re.search(r"\d{3,4}", row["author_death_year"] or ""):
                report["short"].append([work_id, "no author death year (anonymous)", record["title"]]); continue
            chapters = trim_ends(work_id, chapters)
            length = sum(len(body) for _, body in chapters)
            if length < (400 if row["kind"] == "poem" else 1500): report["short"].append([work_id, length, record["title"]]); continue
            if work_id not in meta: report["no_meta"].append(work_id); continue
            rating, blurb = meta[work_id]
            kind = KIND.get(row["kind"], "novel")
            year = re.search(r"\d{3,4}", row["first_published_year"] or "")
            died = re.search(r"\d{3,4}", row["author_death_year"] or "")
            work = dict(id=work_id, title=title[:120], author=row["author"].strip(), author_died=int(died.group()) if died else None,
                        language=language, kind=kind, category=CATEGORY_OF_KIND.get(kind, "fiction"), rating=rating,
                        first_published=int(year.group()) if year else None, blurb=blurb,
                        source_title=f"Wikisource, CC BY-SA 4.0; {MODERN_SPELLING if modernised else ADAPTED.get(language, 'formatting adapted')}",
                        source_url=f"https://{host}/w/index.php?oldid={record['revid']}",
                        chapters=[{"title": t[:120], "body": safe_text(b)} for t, b in chapters])
            json.dump(work, open(os.path.join(out_dir, work_id + ".json"), "w"), ensure_ascii=False)
            report["built"].append([work_id, len(chapters), length])
        json.dump(report, open(os.path.join(out_dir, f"_report_{language}.json"), "w"), ensure_ascii=False, indent=1)
        print(language, {k: len(v) for k, v in report.items()})

if __name__ == "__main__":
    main(sys.argv[1:])
