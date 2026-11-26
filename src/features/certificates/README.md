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
- `lib/certificateLook.ts` (G13a): the eight colours and the patterns a certificate can be drawn in,
  saved on each certificate at signing; `components/CertificateFrame.tsx` draws the frame, the
  faint pattern and the seal, and `CertificateLookPicker.tsx` is the teacher's choice (its
  preview is `CertificateLookPreview.tsx`, since BOOKS-8c). Since G13b the seal shows the cat or the school's crest (`CertificateSeal.tsx`,
  `CertificateSealChoices.tsx`, `CertificateCrestField.tsx`; `api/certificateCrest.ts` and
  `hooks/useCertificateCrest.ts` upload, choose and read it).
- `lib/certificateDate.ts`: dates in the certificate's language; `lib/pickedResults.ts`: the
  teacher's choices as the list the database takes.
- `components/MyCertificatesPage.tsx` (`/certificates`), `CertificatePage.tsx`
  (`/certificates/:certificateId`) with `PrintedNameForm` and `CertificateSheet` (the A4 page the
  browser prints or saves as a PDF), `VerifyCertificatePage.tsx` (`/verify`),
  `ClassCertificatesPage.tsx` (`/spaces/:spaceSlug/certificates`) with `ClassResultsForm`, and
  `ClassCertificatesCard` in a class's settings.
- The staff screen lives with the rest of Schools: `src/features/staff/components/schools/
  StaffCertificatesPage.tsx`.
- Contest certificates (CONTESTS-13b2c; S1-E11-15 criterion 9) use the same list, page and sheet:
  `isContest` and `contestName` switch the sheet to the contest's sentence and one signature, and
  the page leaves out `PrintedNameForm` (a real name only on a class certificate). Staff issue them
  from Staff › Contests (`src/features/contests/`).
- Texts: the `certificates` namespace (`src/locales/*/certificates.json`), registered by
  `registerCertificatesTranslations.ts` when a certificate screen first renders.
- Certificates from a class competition (CLASS-POINTS part 3; S1-E8-17): the Winner card opens
  `ClassCertificatesPage` with `?competition=<id>`, and `CompetitionCertificatesForm` lists the
  confirmed results read-only (Winner, Finalist, Contestant, and Readers' choice as a second
  certificate). `lib/competitionCertificates.ts` turns them into the list the database takes;
  `IssueAnswer.tsx` is the answer under "Approve and sign", shared with `ClassResultsForm`. The
  database checks every line against the competition's results.
- The pages as boards G14 to G17 draw them (BOOKS-8, part 8c): `MyCertificatesPage` lists rows
  (a dot in the certificate's colour, the programme, one meta line); `CertificatePage` puts the
  sheet beside `PrintedNameForm` ("Name and language"); `VerifyCertificatePage` shows
  `CertificateCheckAnswer` (the class, school and teacher from `verify_certificate()`, never a
  pupil's name); `ClassCertificatesPage` shows the class's section tabs and
  `CertificateFormColumns`: the form (`CertificateEntryRows` for a competition's results, or
  `ClassResultsForm`'s list, then `CertificateLookPicker`) beside `CertificateLookPreview`.
