# IDEAS-1 part f: library shelves in Download my data (idea IDEA-20261031-12)

- Migration 20261124100001: export_library_of(), my_data_export() + library.
- Front: lib/libraryForExport.ts (withLibraryLinks, libraryCsvFile), runDataExport, useDataExport labels, includes line.
- Tests: pgTAP 220; runDataExport.test; e2e download-my-data.
- Then the bundle's full e2e run.
