# PRIVACY f: EPUB of a completed story (Robert, 1 Nov 2026, 06:31 to 06:40)

Decisions from the thread:
- Only the story's writer, only when the story is Completed. Chapters only, never the Atlas.
- A short form first: the name on the book (pen name filled in; any name, legal name too, typed
  each time, never sent or stored: rule 5), the title (filled in from the story), the cover (the
  story's own, or a picture from the device for this book only, never uploaded, so no picture
  check is needed).
- Inside, in order: cover, title page, copyright page, table of contents, every published chapter.
- Copyright page: "© {{year}} {{author}}. All rights reserved." plus prepared through
  {{productName}}, {{siteUrl}}, issued on {{date}}. Staff edit the words in Interface text
  (S1-E11-18); placeholders are locked there already. Product name and site from brand config.
- Published chapters only (proposal; asked Robert).

Build:
- Built entirely in the writer's browser and saved straight to their device (no exports row, no
  upload, no notification): the name and any chosen cover never leave the device.
- src/lib/epub/: buildEpub() with JSZip: mimetype (stored, first), META-INF/container.xml,
  OEBPS/content.opf (EPUB 3, dc:language from the story, dc:creator the confirmed name, modified
  date), nav.xhtml (the table of contents, also a page), toc.ncx (older readers), cover.xhtml +
  the cover image, title.xhtml, copyright.xhtml, chapter-N.xhtml. Chapter Markdown -> XHTML with
  the sanitised Markdown subset (ADR 0005), pictures included where they load, music and video as
  links. Stylesheet: plain, readable, no fonts embedded.
- Cover: uploaded picture from the covers bucket, or the drawn or automatic cover rendered from
  its SVG to PNG in the browser; or the writer's own picture file (JPEG or PNG).
- UI: in Download my stories, for a completed story, "Make an EPUB for e-readers" opens a
  dialog form (name, title, cover choice with preview), then "Make EPUB" saves "<slug>.epub".
- Locale keys in dataExport.json epub.* (form) and epub.book.* (the copyright and title page
  words, admin-editable as interface text).
- Tests: Vitest for buildEpub (mimetype first and stored, OPF lists every chapter, nav order,
  copyright text with placeholders filled, XHTML well-formed); e2e: a completed story offers the
  EPUB, an ongoing one doesn't, the file opens as a ZIP with the chapters in order and the
  typed name on the copyright page; axe on the dialog.
