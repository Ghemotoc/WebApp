# Legal

The Legal centre (screen 7.2) and the "We've updated our Terms" notice. Built by S1-E14-01; S1-E14-02 adds the contact and company details, S1-E14-03 the accessibility statement.

- `components/LegalCentrePage.tsx`: the page at `/legal/:documentSlug` (`/legal` opens the terms): the board's header, the row of documents and the chosen document.
- `components/LegalDocumentNav.tsx`: the row of documents. Links with their own addresses, not tabs, so sign-up, Settings and the footer can link to one document.
- `components/LegalDocumentView.tsx`: one document: title, introduction, status pills (draft, version, date, languages), notes, the document's "In short", the section cards and the version history.
- `components/LegalSectionCard.tsx`: one numbered section: "In short", then the full text in a dashed box that scrolls on its own.
- `components/LegalMarkdown.tsx`: renders a part of the text with react-markdown (no raw HTML), plus the "After the invited test" label and highlighted `[placeholders]`.
- `components/LegalUpdateNotice.tsx`: shown at the top of every page (AppLayout) when a signed-in person must accept a new important version before posting.
- `hooks/useLegalVersions.ts`, `hooks/useLegalAcceptance.ts`: the data, through TanStack Query.
- `api/legalDocuments.ts`: reads `legal_document_versions` (public, live versions only) and calls `my_legal_documents_to_accept()` and `accept_current_legal_versions()`.
- `lib/`: `parseLegalDocument` (cuts a text into its parts), `fillBrandTokens` (brand values from `src/config/brand.ts`), `legalMarks` (the remark plugin), `chooseLegalVersion` (which version and language to show), `legalDocumentList` (the documents and dates).

Where the text comes from: `content/legal/` (English drafts) and `content/legal/ro/` (Romanian draft translations), turned into a migration by `scripts/build-legal-migration.ts`; `content/legal/after-the-invited-test.json` says which lines apply only after the invited test. Each new version is a new migration; published versions are never edited.

Database side: `supabase/migrations/…_s1_e14_01_legal_documents.sql` (tables and policies) and `…_s1_e14_01_legal_gate.sql` (the account gate's `legal_acceptance_required` and the two functions). Tests: `supabase/tests/database/015` to `017`, `src/features/legal/**/*.test.ts(x)`, `scripts/legal/prepare-legal-text.test.ts`, `e2e/legal.spec.ts`.

Contact and company details (S1-E14-02): the fourth document, `contact`, at `/legal/contact`. `lib/fillBrandTokens.ts` turns every address into an email link; Settings (`LegalLinksSection`) and the footer link to the page.
