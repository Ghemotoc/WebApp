-- The contact and company details page, as a fourth legal document (story S1-E14-02).
--
-- What it adds: the "contact" row in legal_documents (/legal/contact), shown in the Legal centre
-- after the guidelines. It needs no acceptance: it informs, it isn't an agreement. Its text is the
-- next, generated migration (…_s1_e14_02_contact_v0_1.sql, scripts/build-legal-migration.ts).
-- Why here: DSA art. 11 and 12 and Regulation (EU) 2021/784 art. 15 need published contact points
-- for authorities and users, with the languages accepted; the company details follow once the
-- company is registered (Q55, OPEN), and stay placeholders until then.

insert into public.legal_documents (slug, sort_order, needs_acceptance)
values ('contact', 4, false);
