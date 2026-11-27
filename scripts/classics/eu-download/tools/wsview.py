"""Wikisource downloader through the normal page view (CONTENT thread, 26 Nov 2026).

Wikisource's API refuses this cloud address (HTTP 429 on every call), but the ordinary article
pages load. Each page view carries the rendered text (#mw-content-text) and its revision id
(wgRevisionId), which the CC BY-SA credit needs. Subpages the work links to ("Title/Capitolul I")
are fetched in link order, two levels deep. Contact User-Agent, one request at a time, 1.5 s apart.
Input: id<TAB>host<TAB>title. Output: OUT/<id>.json = {title, revid, html, subpages:[{title, revid, html}]}.
"""
import json, os, re, sys, time, urllib.parse, urllib.request, ssl
from bs4 import BeautifulSoup

USER_AGENT = "GhemotocBot/0.1 (hello@ghemotoc.tech)"
ssl_context = ssl.create_default_context(cafile=os.environ.get("SSL_CERT_FILE") or None)

def view(host, title):
    """Load one article view; return (final title, revision id, content HTML) or None when missing."""
    url = f"https://{host}/w/index.php?" + urllib.parse.urlencode({"title": title})
    for attempt in range(30):
        time.sleep(2)
        try:
            request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
            with urllib.request.urlopen(request, timeout=90, context=ssl_context) as response:
                page = response.read().decode("utf-8")
            break
        except urllib.error.HTTPError as error:
            if error.code == 404: return None
            if error.code in (429, 500, 502, 503, 504):
                wait = min(300, int(error.headers.get("retry-after") or 5) + 10 * attempt)
                print(f"  {error.code} on {title}, waiting {wait}s", file=sys.stderr, flush=True); time.sleep(wait); continue
            raise
        except Exception as error:
            print(f"  error {error}", file=sys.stderr, flush=True); time.sleep(10 * (attempt + 1))
    else:
        raise RuntimeError(f"gave up on {title}")
    revid = re.search(r'"wgRevisionId":(\d+)', page)
    final = re.search(r'"wgPageName":"((?:[^"\\]|\\.)*)"', page)
    soup = BeautifulSoup(page, "lxml")
    content = soup.select_one("#mw-content-text")
    if not revid or int(revid.group(1)) == 0 or content is None: return None
    final_title = json.loads('"' + final.group(1) + '"').replace("_", " ") if final else title
    return final_title, int(revid.group(1)), str(content)

def link_target(host, href):
    """The page title an article link points to on this wiki, or None (Parsoid writes ./Title or full URLs)."""
    if "redlink" in href or "action=" in href: return None
    for prefix in (f"https://{host}/wiki/", "/wiki/", "./"):
        if href.startswith(prefix):
            return urllib.parse.unquote(href[len(prefix):].split("#")[0]).replace("_", " ")
    return None

def disambiguation_choice(host, title, html, author):
    """On a disambiguation page, the link for this author's work ("Title (Surname)"), or None."""
    if author is None or not re.search(r"dezambiguizare|Disambiguation|Förgreningssida|flertydig|Pekerside|Andre betydninger", html, re.I): return None
    tokens = [t for t in re.split(r"[\s.]+", author) if len(t) > 2]
    soup = BeautifulSoup(html, "lxml")
    for link in soup.select("a[href]"):
        target = link_target(host, link["href"])
        if target and target.startswith(title) and target != title and any(t in target for t in tokens):
            return target
    return None

def subpages(host, title, html):
    """Titles of this page's own subpages, in the order they are linked."""
    soup = BeautifulSoup(html, "lxml")
    seen = []
    for link in soup.select("a[href]"):
        target = link_target(host, link["href"])
        if target is None: continue
        if target.startswith(title + "/") and target not in seen:
            seen.append(target)
    return seen

def fetch(work_id, host, title, out_dir, author=None):
    path = os.path.join(out_dir, work_id + ".json")
    if os.path.exists(path): return
    main = view(host, title)
    if main is not None:
        chosen = disambiguation_choice(host, title, main[2], author)
        if chosen: main = view(host, chosen)
    if main is None:
        json.dump({"title": title, "missing": True}, open(path, "w")); print(f"{work_id}: MISSING {title}", flush=True); return
    final_title, revid, html = main
    record = {"host": host, "title": final_title, "revid": revid, "html": html, "subpages": []}
    for sub in subpages(host, final_title, html):
        got = view(host, sub)
        if got is None: continue
        record["subpages"].append({"title": got[0], "revid": got[1], "html": got[2]})
        for subsub in subpages(host, got[0], got[2]):
            deeper = view(host, subsub)
            if deeper: record["subpages"].append({"title": deeper[0], "revid": deeper[1], "html": deeper[2]})
    json.dump(record, open(path, "w"), ensure_ascii=False)
    print(f"{work_id}: {final_title} rev {revid} + {len(record['subpages'])} subpages", flush=True)

if __name__ == "__main__":
    list_file, out_dir = sys.argv[1], sys.argv[2]
    os.makedirs(out_dir, exist_ok=True)
    for line in open(list_file, encoding="utf-8"):
        if line.strip():
            fields = line.rstrip("\n").split("\t")
            fetch(fields[0], fields[1], fields[2], out_dir, fields[3] if len(fields) > 3 else None)
