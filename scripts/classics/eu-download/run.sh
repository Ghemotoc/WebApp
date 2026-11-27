#!/usr/bin/env bash
# Download the European classics from Wikisource, build one JSON per work and pack them
# (CONTENT thread, 27 Nov 2026). Runs on a home connection because Wikisource throttles
# the shared cloud address. Safe to stop and start again: finished works are skipped.
# Usage: bash run.sh [languages...]   (default: every language in eu/rows.json, the biggest eight first)
# Output: out/<lang>.jsonl.gz (one work per line) and out/_report_<lang>.json.
set -euo pipefail
cd "$(dirname "$0")"

# Step 1: a private Python with the one library the scripts need (BeautifulSoup).
if [ ! -d .venv ]; then python3 -m venv .venv; fi
./.venv/bin/pip install --quiet beautifulsoup4
PY=./.venv/bin/python3

LANGS=("$@")
if [ ${#LANGS[@]} -eq 0 ]; then
  # Robert, 27 Nov 2026: load every free European work, the biggest eight languages first.
  LANGS=(ru pl fr de es it pt nl $("$PY" -c "import json; print(' '.join(k for k in json.load(open('eu/rows.json')) if k not in 'ru pl fr de es it pt nl'.split()))"))
fi
mkdir -p logs out
for lang in "${LANGS[@]}"; do
  # Step 2: download every free work of this language (pages already fetched are skipped).
  echo "== $lang: downloading"
  "$PY" tools/wsapi_eu.py eu/rows.json "$lang" >> "logs/$lang.log" 2>> "logs/$lang.err"
done
# Step 3: Russian contents pages that only link to their poems and stories: fetch the linked pages.
if printf '%s\n' "${LANGS[@]}" | grep -qx ru; then
  "$PY" tools/wsapi_listed.py ru ru-fables ru-a-sportsman-s-sketches ru-sevastopol-sketches ru-petersburg ru-stone \
    ru-a-dozen-knives-in-the-back-of-the-revolution ru-the-cavalry-maiden ru-alyonushka-s-tales ru-the-pillar-of-fire \
    ru-the-bathhouse ru-the-minor ru-humorous-stories ru-pearls ru-evening-album >> logs/ru.log 2>> logs/ru.err || true
fi
for lang in "${LANGS[@]}"; do
  # Step 4: turn the pages into chapters (author's text only) and pack them.
  echo "== $lang: building"
  "$PY" tools/build_eu.py "$lang"
  "$PY" - "$lang" <<'PYEOF'
import glob, gzip, json, os, shutil, sys
lang = sys.argv[1]
with gzip.open(f"out/{lang}.jsonl.gz", "wt", encoding="utf-8") as out:
    for path in sorted(glob.glob(f"works_eu/{lang}-*.json")):
        out.write(json.dumps(json.load(open(path, encoding="utf-8")), ensure_ascii=False) + "\n")
shutil.copy(f"works_eu/_report_{lang}.json", f"out/_report_{lang}.json")
print(lang, "packed", os.path.getsize(f"out/{lang}.jsonl.gz") // 1024, "KB")
PYEOF
done
echo "== done"
