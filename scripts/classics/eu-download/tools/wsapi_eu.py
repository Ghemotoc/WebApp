"""Faster Wikisource downloader through the API (CONTENT thread, 27 Nov 2026).

Page views were rate-limited to about one page a second, which would take a day for the
European list. The API answers again, so this asks action=parse to render up to BATCH subpages
in one call: the wikitext is a list of transclusions ({{:Title/Chapter}}), each after a marker,
and the HTML is cut back into pages at the markers. Relative links inside a page ([[/Глава I]])
resolve against the parse title, a placeholder, so they are mapped back onto the page's own title.
Same rules as wsfetch_eu.py otherwise (three levels, MAX_PAGES, /ДО skipped when /ВТ exists).
Usage: wsapi_eu.py rows.json <lang>. Output: raw/eu/<lang>/<id>.json.
"""
import json, os, re, sys, time, urllib.parse, urllib.request, ssl
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from bs4 import BeautifulSoup
from wsfetch_eu import choose, MAX_PAGES
from wsview import link_target

USER_AGENT = "GhemotocBot/0.1 (hello@ghemotoc.tech)"
CONTEXT = ssl.create_default_context(cafile=os.environ.get("SSL_CERT_FILE") or None)
PLACEHOLDER = "Ghemotoc batch"
BATCH = 10

def api(host, params):
    """POST one API call; back off on 429, 5xx and maxlag. Returns the decoded JSON."""
    body = urllib.parse.urlencode(dict(params, format="json", formatversion="2", maxlag="5")).encode()
    for attempt in range(60):
        time.sleep(1.2)
        try:
            request = urllib.request.Request(f"https://{host}/w/api.php", data=body, headers={"User-Agent": USER_AGENT})
            with urllib.request.urlopen(request, timeout=180, context=CONTEXT) as response:
                data = json.loads(response.read().decode("utf-8"))
            if data.get("error", {}).get("code") == "maxlag": time.sleep(5 + 5 * attempt); continue
            return data
        except urllib.error.HTTPError as error:
            if error.code in (429, 500, 502, 503, 504):
                wait = min(300, int(error.headers.get("retry-after") or 5) + 10 * attempt)
                print(f"  {error.code}, waiting {wait}s", file=sys.stderr, flush=True); time.sleep(wait); continue
            raise
        except Exception as error:
            print(f"  error {error}", file=sys.stderr, flush=True); time.sleep(10 * (attempt + 1))
    raise RuntimeError("gave up")

def parse_page(host, title):
    """One page: (final title, revid, html) or None when it does not exist."""
    data = api(host, {"action": "parse", "page": title, "redirects": "1", "prop": "text|revid", "disablelimitreport": "1"})
    if "error" in data: return None
    parsed = data["parse"]
    return parsed["title"], parsed["revid"], parsed["text"]

def remap(html, page_title, placeholder):
    """Point links made relative to the placeholder back at the page that holds them."""
    for form in (urllib.parse.quote(placeholder.replace(" ", "_")), placeholder.replace(" ", "_")):
        html = html.replace(f"/wiki/{form}/", "/wiki/" + urllib.parse.quote(page_title.replace(" ", "_")) + "/")
    return html

def parse_batch(host, titles):
    """Render several pages in one call; returns {title: html} for the pages that exist."""
    # The placeholder sits beside the pages, so "../Sibling" links resolve as they do on each page.
    placeholder = titles[0].rsplit("/", 1)[0] + "/" + PLACEHOLDER if "/" in titles[0] else PLACEHOLDER
    text = "\n".join(f'<div class="ghbatch">{index}</div>\n{{{{:{title}}}}}\n' for index, title in enumerate(titles))
    data = api(host, {"action": "parse", "title": placeholder, "text": text, "contentmodel": "wikitext",
                      "prop": "text", "disablelimitreport": "1"})
    html = data.get("parse", {}).get("text", "")
    pieces = re.split(r'<div class="ghbatch">(\d+)</div>', html)
    out = {}
    for position in range(1, len(pieces) - 1, 2):
        title = titles[int(pieces[position])]
        segment = pieces[position + 1]
        # A missing page transcludes as a red link to itself.
        if "redlink=1" in segment and len(BeautifulSoup(segment, "lxml").get_text().strip()) < 200: continue
        out[title] = '<div class="mw-parser-output">' + remap(segment, title, placeholder) + "</div>"
    return out

def children(host, title, html):
    """This page's own subpages in link order; old-spelling copies skipped when a modern twin exists."""
    soup = BeautifulSoup(html, "lxml")
    subs = []
    for link in soup.select("a[href]"):
        target = link_target(host, link["href"])
        if target and target.startswith(title + "/") and target not in subs: subs.append(target)
    modern = {s[:-3] for s in subs if s.endswith("/ВТ")}
    return [s for s in subs if not (s.endswith("/ДО") and s[:-3] in modern)]

def fetch(work_id, host, title, out_dir, author):
    path = os.path.join(out_dir, work_id + ".json")
    if os.path.exists(path): return
    main = parse_page(host, title)
    if main and len(BeautifulSoup(main[2], "lxml").get_text()) < 20000 and not children(host, main[0], main[2]):
        chosen = choose(host, main[0], main[2], author)
        if chosen:
            main = parse_page(host, chosen) or main
    if main is None:
        json.dump({"title": title, "missing": True}, open(path, "w")); print(f"{work_id}: MISSING {title}", flush=True); return
    record = {"host": host, "title": main[0], "revid": main[1], "html": main[2], "subpages": []}
    # Breadth by level, but each page's children are placed right after it, so reading order holds.
    order = [(s, 1) for s in children(host, main[0], main[2])]
    seen, pages, index = set(s for s, _ in order), {}, 0
    while index < len(order) and len(pages) < MAX_PAGES:
        batch = [t for t, _ in order[index:index + BATCH]]
        got = parse_batch(host, batch)
        inserted = 0
        for offset, (sub, depth) in enumerate(order[index:index + BATCH]):
            if sub not in got: continue
            pages[sub] = (got[sub], depth)
            if depth < 3:
                deeper = [(s, depth + 1) for s in children(host, sub, got[sub]) if s not in seen]
                seen.update(s for s, _ in deeper)
                place = index + BATCH + inserted
                order[place:place] = deeper; inserted += len(deeper)
        index += len(batch)
    # Reading order: a parent, then its children, depth first, following the order list.
    def emit(parent, depth):
        for sub, level in order:
            if level == depth and sub.rsplit("/", 1)[0] == parent and sub in pages:
                record["subpages"].append({"title": sub, "revid": main[1], "html": pages[sub][0], "depth": level})
                emit(sub, depth + 1)
    emit(main[0], 1)
    # Pages whose parent was renamed by a redirect still count, in list order.
    listed = {s["title"] for s in record["subpages"]}
    for sub, level in order:
        if sub in pages and sub not in listed:
            record["subpages"].append({"title": sub, "revid": main[1], "html": pages[sub][0], "depth": level})
    json.dump(record, open(path, "w"), ensure_ascii=False)
    print(f"{work_id}: {main[0]} rev {main[1]} + {len(record['subpages'])} subpages", flush=True)

if __name__ == "__main__":
    rows_file, language = sys.argv[1], sys.argv[2]
    out_dir = os.path.join(os.path.dirname(os.path.abspath(rows_file)), "..", "raw", "eu", language)
    os.makedirs(out_dir, exist_ok=True)
    for work_id, host, title, author, _ in json.load(open(rows_file))[language]:
        if re.match(r"^(Índice|Livre|Llibre|Index|Dizin|Author):", title):
            json.dump({"title": title, "missing": True, "scan_index": True}, open(os.path.join(out_dir, work_id + ".json"), "w")); continue
        try:
            fetch(work_id, host, title, out_dir, author)
        except Exception as error:
            print(f"{work_id}: ERROR {error}", flush=True)
