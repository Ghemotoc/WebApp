# Brief: write artboards for the Design canvas "App and social demo screens"

Canvas url: https://claude.ai/artifact/PMdGAYUPHUff27xJd1tGco
Local root (shared by all agents): /tmp/claude-0/-home-claude/81bd3d84-ce62-5120-9726-ce422af8ebd9/scratchpad/canvas
The index project/canvas.json is ALREADY WRITTEN in that root (do not change it). Each artboard is project/<Name>.dc.html under the root, with the size given in the index (open project/canvas.json to see your boards' w and h).

Read first: /home/claude/demo/_VISUAL_SPEC.md (look, tokens, product facts, sample content). Load the Artifact tool with ToolSearch "select:Artifact" if needed.

## Artboard file format (Design type rules; each fails silently if broken)
Each file is one self-contained page:
```
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Short screen name</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&family=Inter:wght@400;500;600;700&family=Architects+Daughter&display=swap">
<style>
body{margin:0}
a{color:#672786}a:hover{color:#481C5F}
</style>
</helmet>
<div style="...root...">  ... all markup ... </div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{"$preview":{"width":W,"height":H}}'>
class Component extends DCLogic {
renderVals() { return {}; }
}
</script>
</body>
</html>
```
- Keep `<script src="./support.js"></script>` EXACTLY. Close every non-void element, quote every attribute.
- All styling INLINE in style="" (the properties panel edits that); `<helmet><style>` only for body margin, a/a:hover colours, and font-family on the root is fine inline.
- These are STATIC mock-ups: no {{holes}}, no handlers; the script block still must be present as above.
- App screens are desktop-app PAGES (index has expand "fill"): the root is fluid: width:100%; max-width:1440px; min-height:900px; box-sizing:border-box; use flex/grid with gap, %, fr; a side menu + content row uses flex-wrap:wrap with content flex: 999 1 560px; min-width:0 so it stacks at phone width. Design it to look right at exactly 1440x900 (that is what gets rendered). No vh units.
- Social mock-ups and the poster have FIXED roots at exactly the board's w x h (e.g. width:390px;height:844px;overflow:hidden).
- Accessible markup: real <button>, <a href="#">, <input> with <label>, aria-label on icon-only buttons; inline SVG icons with aria-hidden="true" when decorative. No emoji in UI chrome (comment reactions may use emoji). No <iframe>, no scripts building UI, no data: URIs, no external images. Images: use the mesh backgrounds ONLY if you need one, via the Google-free route: skip images entirely, draw with CSS (gradients are fine) and inline SVG. Covers for stories: CSS gradient blocks with the title set in type (no photos).
- Platform look-alikes (TikTok, Instagram, YouTube Shorts, Reddit, Discord, Facebook): evoke the layout generically (phone frame, right-side action column, caption area; feed card; channel list) with NEUTRAL inline-SVG icons and the platform name written as plain text in a small label; never draw or imitate a platform's logo or trademarked icon. Our own brand content inside is the point.

## Publishing
Write each file with your file-writing tool (never generate canvas files with a script). Publish with the Artifact tool: `{"action":"publish","url":"https://claude.ai/artifact/PMdGAYUPHUff27xJd1tGco","root":"<root>","file_path":"<root>/project/<first file>","files":{"project/<other>.dc.html":"project/<other>.dc.html"}}`. Only send files you wrote; never send project/canvas.json unless told to. Publish as you go (one or two artboards per call). If a publish is refused because someone saved meanwhile, re-publish only your files.

## PNG renders for the decks (required)
After all your artboards are published, render each to a 2x PNG for the slide decks:
`python3 /home/claude/demo/render.py /home/claude/demo/png <root>/project/<Name>.dc.html:WxH ...` (W and H from the index). Then Read each PNG once to check it looks right (text not clipped, nothing overlapping, fonts loaded). Fix the .dc.html, re-publish and re-render if needed. This check is for the deck images and is requested by the user.

## Voice
Plain, warm, short, English. Never the Magic Coffin vampire lexicon inside the app or the social content. British English, no Oxford commas, no em dashes. Numbers are demo numbers.

## Reply
List the artboards you published, the PNG paths, and anything you could not do. No file contents.
