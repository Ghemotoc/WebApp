# Sponsors

Staff › Sponsors: sponsors, their campaigns, the review before a campaign goes live and the
categories no ad may ever promote (story S1-E12-02). Built in bundle SPONSORS-b2; the database
side is part b1 (`supabase/migrations/…_sponsors_b1_campaigns.sql`) and the sponsored ad's look on
reader pages comes in part b3 (in `src/features/ads/`).

- `api/sponsors.ts`: the one way the app reads and writes sponsors: the `sponsors` and
  `ad_blocked_categories` tables and the `admin_*sponsor*` functions. Failures become a
  `SponsorError` with the server's reason and, for an incomplete campaign, the list of problems.
- `hooks/useSponsorsAdmin.ts`: everything the screens read (`useSponsorsData`) and every change
  they make (`useSponsorChanges`), refreshing the lists after each one.
- `hooks/useCampaignDatesInWords.ts`: a campaign's dates in the reader's language.
- `lib/sponsorWords.ts`: locale keys for problem and error codes, and a campaign's status
  ("Live" is an approved campaign inside its dates).
- `lib/campaignFields.ts`: the editor's empty values, a saved campaign's values and tags typed as
  text.
- `components/staff/`: `StaffSponsorsPage` (principles, review queue, campaigns, sponsors, never
  advertised) and `CampaignEditorPage` (the campaign form, the creative upload and "End
  campaign").

The field limits are in `src/schemas/sponsors.ts`, mirrored by the database. The interface text is
the `sponsors` namespace, registered by `registerSponsorTranslations.ts`. The creative goes through
the picture check like every upload (`uploadSponsorCreative` in `src/features/pictures/`).
