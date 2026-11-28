"""Wikisource downloader for the European classics (CONTENT thread, 26-27 Nov 2026).

Builds on wsview.py (ordinary page views, revision id for the CC BY-SA credit). Differences:
subpages are followed up to three levels deep (Том/Часть/Глава), at most MAX_PAGES per work;
Russian old-spelling copies ("/ДО") are skipped when a modern-spelling one ("/ВТ") is linked;
disambiguation pages in more languages pick the link that names the author.
Input: rows.json from the list builder, a language code. Output: raw/eu/<lang>/<id>.json.
One request at a time per wiki, 2 s apart; each language runs in its own process.
"""
import json, os, re, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import wsview
from wsview import view, subpages, link_target
from bs4 import BeautifulSoup

MAX_PAGES = 400
DISAMBIGUATION = re.compile(r"dezambiguizare|Disambiguation|Homonymie|Begriffsklärung|desambiguaci|Disambigua|"
                            r"Desambigua|ujednoznacznienie|doorverwijs|неоднозначност|Значения|redakcj|"
                            r"версии|редакции|Варианты|Versionen|versions|Ediciones|edizioni|edições", re.I)

def choose(host, title, html, author):
    """On a disambiguation or editions page, the first link under this title naming the author, else the first under this title."""
    if not DISAMBIGUATION.search(html): return None
    tokens = [t for t in re.split(r"[\s.,]+", author or "") if len(t) > 2]
    soup = BeautifulSoup(html, "lxml")
    under, named = [], []
    for link in soup.select("#mw-content-text a[href]"):
        target = link_target(host, link["href"])
        if not target or ":" in target.split("/")[0] or target == title: continue
        if target.startswith(title.split(" (")[0]):
            under.append(target)
            if any(t in target for t in tokens): named.append(target)
    picks = named or under
    # Prefer a modern-spelling edition on Russian Wikisource.
    for pick in picks:
        if pick.endswith("/ВТ") or "(ВТ" in pick: return pick
    return picks[0] if picks else None

def children(host, title, html):
    """Subpages to fetch: skip old-spelling copies that have a modern twin."""
    subs = subpages(host, title, html)
    modern = {s[:-3] for s in subs if s.endswith("/ВТ")}
    return [s for s in subs if not (s.endswith("/ДО") and s[:-3] in modern)]

def fetch(work_id, host, title, out_dir, author):
    path = os.path.join(out_dir, work_id + ".json")
    if os.path.exists(path): return
    main = view(host, title)
    if main is not None and len(BeautifulSoup(main[2], "lxml").get_text()) < 20000:
        chosen = choose(host, main[0], main[2], author)
        if chosen and not subpages(host, main[0], main[2]):
            got = view(host, chosen)
            if got: main = got
    if main is None:
        json.dump({"title": title, "missing": True}, open(path, "w")); print(f"{work_id}: MISSING {title}", flush=True); return
    record = {"host": host, "title": main[0], "revid": main[1], "html": main[2], "subpages": []}
    queue = [(s, 1) for s in children(host, main[0], main[2])]
    seen = set(q for q, _ in queue)
    # Depth-first in link order, so chapters stay in reading order.
    while queue and len(record["subpages"]) < MAX_PAGES:
        sub, depth = queue.pop(0)
        got = view(host, sub)
        if got is None: continue
        record["subpages"].append({"title": got[0], "revid": got[1], "html": got[2], "depth": depth})
        if depth < 3:
            deeper = [(s, depth + 1) for s in children(host, got[0], got[2]) if s not in seen]
            seen.update(s for s, _ in deeper)
            queue = deeper + queue
    json.dump(record, open(path, "w"), ensure_ascii=False)
    print(f"{work_id}: {main[0]} rev {main[1]} + {len(record['subpages'])} subpages", flush=True)

if __name__ == "__main__":
    rows_file, language = sys.argv[1], sys.argv[2]
    out_dir = os.path.join(os.path.dirname(rows_file), "..", "raw", "eu", language)
    os.makedirs(out_dir, exist_ok=True)
    for work_id, host, title, author, _ in json.load(open(rows_file))[language]:
        if re.match(r"^(Índice|Livre|Llibre|Index|Dizin|Author):", title):
            json.dump({"title": title, "missing": True, "scan_index": True}, open(os.path.join(out_dir, work_id + ".json"), "w")); continue
        try:
            fetch(work_id, host, title, out_dir, author)
        except Exception as error:
            print(f"{work_id}: ERROR {error}", flush=True)
