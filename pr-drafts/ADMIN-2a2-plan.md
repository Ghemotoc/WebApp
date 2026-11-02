# ADMIN-2a2 plan: rename the story bible to Story world (Robert, 2 Nov 2026, 15:35)

- Texts: every user-facing "bible" in atlas.json and dataExport.json (ro and en) becomes Story world / Lumea poveștii. Keys stay.
- Address: /plan/s/<story>/world/<entry>; /plan/s/<story>/bible/<entry> redirects (OldBibleAddressRedirect), keeping ?edit and #.
- Links: AtlasSectionNav, BibleContents, BiblePage, itemAddress (search and [[links]]).
- Code, tables and functions keep "bible"; database error messages are never shown, so they stay.
- Tests: atlas-bible (new redirect test, Story world names), atlas-search-links (old address opens the entry under /world), itemAddress unit test.
- Docs: decisions.md (both 15:35 decisions), the S1-E17-17 story note, code tour, atlas README.
