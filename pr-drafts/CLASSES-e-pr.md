<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_


Closes #78

Bundle 11 CLASSES, part e: writing certificates for class programmes (S1-E8-12). Part f is the forums epic check (S1-E8-QA, #79), with the bundle's full end-to-end run.

## What changed
- **The teacher signs (criteria 1 and 5).** A "Certificates" card in a class's settings, for the teacher only, opens `/spaces/<class>/certificates`.
  - The teacher names the programme ("Writing club 2026–2027"), picks a result per student (no certificate, took part, finalist, winner) and presses "Approve and sign".
  - The approval is the teacher's electronic signature: their name prints as the second signatory with "signed electronically" and the date (the proposal for OPEN Q71, 34q).
  - Approving again changes only a changed result. A revoked certificate stays revoked.
  - Each student gets a notification, and the class's log says certificates were signed.
  - Staff can't sign for a teacher. Contests (S1-E12-02) will issue certificates too once they exist.
- **My certificates (criteria 1, 2 and 4).** `/certificates` lists the student's certificates; each opens on its own page.
  - "Your name on the certificate": a class certificate may print the student's real name with the school's name. It is stored only on that certificate (CLAUDE.md rule 5's one exception), never on the profile, and shown only to the student. Empty means the pen name prints.
  - The certificate is drawn in the app with real text, in Romanian or English (a language choice on the page, whatever the interface language): the product name, "In partnership with" the school, the title (achievement or participation), the name, the programme and class, two signatures (ours first, from the `certificate_signatory_name` setting, then the teacher's), the result and year, the code and where to check it.
  - "Print or save as PDF" prints only the certificate as one A4 page; the browser's "Save as PDF" keeps it as tagged text, not a picture.
  - A revoked certificate shows a note instead and can't be printed.
- **The check page (criteria 6 to 8).** `/verify`, for anyone: type a code (any case, spaces allowed) and see "valid" with the programme, the result, the school and the date; "revoked"; or "no longer available" for a certificate deleted with its account. Never the student's name.
- **Staff revoke (criterion 7).** Staff › Schools gets a third tab, "Certificates": find a code, see the certificate (never the printed name) and revoke it with a reason. It goes in the audit log.
- **Archiving tells the teacher (criterion 3).** Archiving a class now sends the teacher a notification and an email that can't be switched off: keep your own copies within 30 days, before the printed names are deleted.
- **The 30 days.** A new nightly retention step, `purge_class_certificate_names()`, deletes printed names 30 days after the class was archived. The certificate then prints the pen name (proposal: the story leaves it to you).
- **Data rights.** Certificates are in Download my data (with the printed name) and are deleted with the account. Their codes alone stay in `retired_certificate_codes`, so the check page can say "no longer available". Only the owner and admins can read that table directly.
- Also fixed: the space log had no words for "archived the class" (part d), so it read "made a change".

## How it was tested
- Database: `236-certificates.test.sql` (43 tests):
  - a student and staff can't sign; names outside the class (and the teacher) get none; empty lists, bad results and unnamed programmes are refused;
  - the teacher signs, each student is told, codes look like `CL27-7K4M-Q9` without look-alike letters, and the school and teacher print as they were;
  - the teacher's list never shows a printed name; the table's own policy lets a student read only their own row (allowed and denied); a visitor can't read the table;
  - the student types and clears a name, but never on someone else's certificate;
  - a visitor checks a code: valid, any case, never the name, unknown for a made-up one;
  - support staff can't revoke; Schools staff can, once, with the audit log; the check page says revoked;
  - archiving stops new certificates, notifies the teacher and queues a required email;
  - the retention job deletes the names after 30 days; a certificate deleted with its account reads "no longer available".
  - an admin reads the retired codes and a student can't (allowed and denied);
  - `021-signed-out-reads` lists the two new tables, and `212-retention-jobs` counts the new clean-up step.
- Unit: `certificates.test.ts` (12), `certificateLib.test.ts` (4) and a new case in `server/notification-emails.test.ts` for the archived-class email.
- End to end: `e2e/certificates.spec.ts` walks the teacher signing, the student printing with a real name in both languages, a visitor checking, staff revoking and archiving notifying the teacher; axe on all five certificate screens at 390, 768 and 1440 px, light and night, ro and en, with the doodle overlap check.
- Screenshots of My certificates, the certificate, the teacher's page, the check page and the staff tab at 1440 and 390 px were checked by eye.

## Local check run
LOCALRUN

## By hand
- Nothing on staging: no SQL top-up and no new secrets. The seed is unchanged.
- Optional: read the new Romanian lines (`certificates.json`; `staffCertificates` and `schoolsTabs.certificates` in `staff.json`; `certificateIssued`, `classArchived` and their actions in `notifications.json`; `classArchived` and `subjectClassArchived` in `email.json`; two log lines in `spaces.json`). I used neutral wording: "Acordată", "Locul întâi", "Calificare în finală" and "cadrul didactic".
- When you change who signs for the company, update the `certificate_signatory_name` setting (today "Robert-Marian Stănescu", from the board).

## Board mismatches
Noted in `docs/board-fixes.md`:
- No QR code: the code and the check address print as text.
- No school logo until a school gives written permission.
- Class programmes have no story, so the line names the programme and the class.
- The PDF is the app's page printed by the browser (see questions).
- Staff › Schools gets a Certificates tab.

## Questions for Robert
1. **The teacher's signature (OPEN Q71, 34q).** Built as proposed: the approval itself, logged, printed with "signed electronically" and the date. Keep it?
2. **The PDF (OPEN Q49, 34f and 34r).** No PDF library was chosen. The certificate prints from the browser as an A4 page with tagged text. Is that enough, or should a server-made PDF follow with the PDF files part (12d)?
3. **After the name is deleted.** The certificate prints the pen name (proposal). Keep it?
4. **The teacher's name.** It prints the teacher's display name (pen name or username), since we store no legal names. Is that right for schools, or should teachers be able to type the name they sign with, like students?
5. **Who signs for us.** The board shows your name as Founder and CEO; it is a setting, so it can change without code.

## Follow-ups
- Contest certificates come with contests (S1-E12-02), with staff marking the results.
- A link to My certificates from the account menu or Settings (today the notification and the certificate pages link there).
- The school's logo, once a school gives written permission.
- The verification page has no rate limit; a code is one of about 887 million a year, so guessing is unlikely, but S1-E10-12 could add one.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
