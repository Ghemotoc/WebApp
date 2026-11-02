# certificates

Writing certificates from class programmes (bundle CLASSES, part e; story S1-E8-12; boards
Certificate-Participation and Certificate-Winner). Contests (S1-E12-02) will issue them too.

- `api/certificates.ts`: the student's list (`my_certificates()`), the printed real name
  (`set_certificate_printed_name()`) and the public check (`verify_certificate()`), with refusals
  as `CertificateError`.
- `api/classCertificates.ts`: the teacher's list and approval (`class_certificates()`,
  `issue_class_certificates()`) and the staff look-up and revoke (`admin_certificate()`,
  `admin_revoke_certificate()`).
- `hooks/useCertificates.ts` and `hooks/useClassCertificates.ts`: the reads and changes.
- `lib/certificateDate.ts`: dates in the certificate's language; `lib/pickedResults.ts`: the
  teacher's choices as the list the database takes.
- `components/MyCertificatesPage.tsx` (`/certificates`), `CertificatePage.tsx`
  (`/certificates/:certificateId`) with `PrintedNameForm` and `CertificateSheet` (the A4 page the
  browser prints or saves as a PDF), `VerifyCertificatePage.tsx` (`/verify`),
  `ClassCertificatesPage.tsx` (`/spaces/:spaceSlug/certificates`) with `ClassResultsForm`, and
  `ClassCertificatesCard` in a class's settings.
- The staff screen lives with the rest of Schools: `src/features/staff/components/schools/
  StaffCertificatesPage.tsx`.
- Texts: the `certificates` namespace (`src/locales/*/certificates.json`), registered by
  `registerCertificatesTranslations.ts` when a certificate screen first renders.
