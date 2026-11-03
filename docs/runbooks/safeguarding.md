# Safeguarding: a child or someone at risk (S1-E10-10)

A safeguarding case is any case about a child at risk or a risk to someone's life or safety:
self-harm, a threat to a minor, sexual content involving a minor, or grooming. Only staff with the
safeguarding permission see these cases. DSA art. 18 asks us to tell the police when we learn of a
threat to someone's life or safety.

## Moving a case into safeguarding

Reports for self-harm, a threat to a minor or sexual content involving a minor open as safeguarding
cases on their own. Any other case can be moved: on the case page, **Move to safeguarding**, with
the reason. After that only safeguarding staff see it.

## The steps (the checklist on the case page)

1. **Is anyone at risk right now?** Read the reports and the content.
2. **If a life is at risk, call 112 first.** Then carry on in the app.
3. **Support contacts.** The case page lists the children's helpline and the emergency numbers for
   the person's country (Romania's when we have none for their country). Put the right one in
   "What we tell the person", in their language.
4. **Evidence pack.** If the police or a helpline needs it, press **Build the evidence pack** and
   say why. It downloads a file with the content, the account's details (including the email),
   the reports and every timestamp. Building it is logged as a sensitive read. Hand it over
   through the authority's own channel, then **delete your copy**: we never keep it.
5. **Report a child sexual abuse image to the police first.** They pass it on (for example to
   DIICOT, the prosecutors for organised crime). **[lawyer to check]**: who we must tell, and
   whether a national hotline report is also expected. Then log the referral.
6. **Log every referral.** Under "Referrals to authorities": the authority, their reference and a
   short note. This is our record that we told them.
7. **Decide the case.** The usual Decision panel: the action, the note for the log, and what we tell
   the person. Remember the person may be a child: plain, kind words, and the helpline.

## Who to call

- Emergency: 112 (anywhere in the EU).
- The contacts on the case page come from `content/safety-contacts.json` (S1-E10-13a). If a
  country is missing, the gap is noted for the next update of that list.

## A suspected child sexual abuse image (ADMIN-2e2b)

Robert's brief of 2 Nov 2026, section 4. It starts in one of two ways:

- **A picture reviewer presses red with "Sexual image of a minor".** The form asks for a few words
  for the police. The picture's file is deleted at once, the evidence is kept, the case moves to
  safeguarding and the uploader's account is closed for good, with a statement of reasons.
- **Arachnid Shield matches a known image.** The file is deleted at once and the evidence is kept,
  with a stand-in description. The case opens in safeguarding, same day. A person closes the
  account: **Close the account for good** in "Evidence about the image" on the case page.

The image is never kept, and there is no quarantine bucket. "Evidence about the image" on the case
page shows what is kept: the times, the file's SHA-256 fingerprint, whether a scrambled IP address
is kept, the description, and how long it is kept (5 years). Rewrite the description in plain
words (**Change the description**). If the police ask for the evidence within the 5 years, put a
**legal hold** on it with their request and its date; the nightly purge then leaves it. The
evidence pack carries all of it, the scrambled IP address and the month of its key included.
**[lawyer to check]**: the 5 years, the legal hold and handing over the scrambled IP.
