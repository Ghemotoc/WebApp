# ADMIN-2d plan: PDF downloads wherever Word is offered (S1-E11-09b)

- Shared PDF builder in src/lib/pdf/ (pdfmake 0.3.12, MIT, lazy-loaded; proposal for OPEN Q49), same input types as src/lib/word/.
- Migration 20261218100001: exports.document_format (word, pdf, both); export_file_extension() with the format; request_stories_export(…, document_format); reusable copy only for the same format; .pdf in the bucket, file name and staff display name checks.
- Download my stories: "Format" radios (Word default). Download my data and staff copies: both formats.
- Tests: src/lib/pdf/storyToPdf.test.ts, run* tests, DB 245, e2e download-my-stories (PDF), download-my-data (PDF in ZIP).
- Docs: decisions.md (Robert's 2 Nov decisions), code tour, ADR 0012 update, README.
