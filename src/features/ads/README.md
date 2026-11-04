# Ads

The ad slots on public pages (story S1-E12-01). Built in bundle SPONSORS-a1 (the slots, house
ads and "Why this ad?"); part a2 placed them on every remaining public page, part b adds sponsor campaigns and
part d the non-personalised ad network.

- `api/ads.ts`: `fetchPageAds()` reads `page_ads(page_key, context)`; `adContextFor()` turns the
  page's context into what the server accepts. Only the page's context is sent, never anything
  about the reader.
- `hooks/usePageAds.ts`: one page's slots, kept for five minutes.
- `components/PageAdSlot.tsx`: what a page places, one per slot (at most two per page).
  `AdBox.tsx` draws the slot with its label and "Why this ad?"; `HouseAdCreative.tsx` draws our
  own ads (a landing page, Start writing, the classics, the forums).
- `lib/whyThisAd.ts`: the "Why this ad?" sentence from the page's category, tag and language.
- `registerAdsTranslations.ts`: the `ads` locale namespace (`src/locales/*/ads.json`).
