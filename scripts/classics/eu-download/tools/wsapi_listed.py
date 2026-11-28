"""Fetch the pages a Wikisource contents page lists when they are not its subpages (27 Nov 2026).

Some works (Крылов's Басни, Записки охотника) have a contents page whose list links ordinary
pages ("Ворона и Лисица (Крылов)"). This reads those links in order, skips namespaced pages,
renders them through the API ten at a time (wsapi_eu.parse_batch) and stores them as subpages.
Usage: wsapi_listed.py <lang> <work_id> [...]
"""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from bs4 import BeautifulSoup
from wsview import link_target
from wsapi_eu import parse_batch, BATCH
import convert_ws

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def listed(host, title, html):
    """Main-namespace pages linked from list items or paragraphs, in order, once each."""
    soup = convert_ws.clean(html)
    seen = []
    for link in soup.select("li a[href], dd a[href], p a[href]"):
        target = link_target(host, link["href"])
        if not target or target == title or target in seen: continue
        if ":" in target.split("/")[0] and not target.split(":")[0][-1:].isdigit(): continue
        seen.append(target)
    return seen

def extend(language, work_id):
    path = os.path.join(BASE, "raw/eu", language, work_id + ".json")
    record = json.load(open(path))
    targets = listed(record["host"], record["title"], record["html"])[:300]
    pages = []
    for start in range(0, len(targets), BATCH):
        got = parse_batch(record["host"], targets[start:start + BATCH])
        pages.extend({"title": t, "revid": record["revid"], "html": got[t], "depth": 1} for t in targets[start:start + BATCH] if t in got)
    record["subpages"] = pages; record["listed"] = True
    json.dump(record, open(path, "w"), ensure_ascii=False)
    print(f"{work_id}: {len(pages)} listed pages of {len(targets)}", flush=True)

if __name__ == "__main__":
    for work_id in sys.argv[2:]:
        extend(sys.argv[1], work_id)
