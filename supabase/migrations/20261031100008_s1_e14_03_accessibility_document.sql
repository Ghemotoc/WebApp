-- The accessibility statement, as a fifth legal document (story S1-E14-03).
--
-- What it adds: the "accessibility" row in legal_documents (/legal/accessibility), shown in the
-- Legal centre after the contact page and linked from the footer. It needs no acceptance: it
-- informs, it isn't an agreement. Its text is the next, generated migration
-- (…_s1_e14_03_accessibility_v0_1.sql, scripts/build-legal-migration.ts) from
-- content/legal/05-accessibility-statement.md and its Romanian draft.
-- Why: WCAG 2.2 AA is our target (architecture principle 8) and an accessibility statement with a
-- way to report barriers is part of it; whether the European Accessibility Act (Directive (EU)
-- 2019/882, Law 232/2022) applies is on the lawyer's list.

insert into public.legal_documents (slug, sort_order, needs_acceptance)
values ('accessibility', 5, false);
