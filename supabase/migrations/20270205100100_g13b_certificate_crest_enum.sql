/*
 * G13b, part 1: a new picture kind for a school's crest on its class certificates (bundle G13 of
 * the liquid glass rebuild; the canvas's SpaceCertificates board, "In the seal: Our school's
 * crest").
 *
 * A new enum value can't be used in the transaction that adds it, so it has its own migration;
 * …_g13b_certificate_crest.sql uses it.
 */

alter type public.picture_kind add value if not exists 'certificate_crest';
