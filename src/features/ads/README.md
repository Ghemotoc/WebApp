# Ads

The ad slots on public pages (story S1-E12-01). Built in bundle SPONSORS-a1 (the slots, house
ads and "Why this ad?"); part a2 placed them on every remaining public page, part b3 draws sponsors' ads and the
"Sponsored by" line (the staff screens are in `src/features/sponsors/`), and part d adds the
non-personalised ad network.

- `api/ads.ts`: `fetchPageAds()` reads `page_ads(page_key, context)`; `adContextFor()` turns the
  page's context into what the server accepts. Only the page's context is sent, never anything
  about the reader.
- `hooks/usePageAds.ts`: one page's slots, kept for five minutes.
- `components/PageAdSlot.tsx`: what a page places, one per slot (at most two per page).
  `AdBox.tsx` draws the slot with its label and "Why this ad?"; `HouseAdCreative.tsx` draws our
  own ads (a landing page, Start writing, the classics, the forums); `SponsorAdCreative.tsx` draws
  a sponsor's ad (the checked picture, its line, the link marked `rel="sponsored"` and an optional
  `DiscountCode.tsx` with a Copy button), reading the picture's address with
  `hooks/useSponsorPicture.ts`.
- `components/NetworkAdCreative.tsx` and `lib/adNetwork.ts`: the ad network's ad (part d, ADR
  0014). The AdSense script loads only when the slot comes into view, once per page, and every
  request is non-personalised; if it can't load, our own "Start writing" ad shows instead.
- `components/SponsoredByLine.tsx` and `hooks/useSponsorCredit.ts`: "Sponsored by <sponsor>" on a
  category's list (`StoryListHeader`) and a contest's page (`LandingPageScreen`), read with
  `fetchSponsorCredit()` from `sponsor_credit()`. It never changes what a list holds or its order.
- `hooks/useSponsorCounting.ts`: one impression each time a sponsor's ad or line appears and one
  click each time its link is followed, through `recordSponsorEvent()` (part c, S1-E12-03). Only
  the campaign's key is sent.
- `lib/whyThisAd.ts`: the "Why this ad?" sentence from the page's category, tag and language.
- `registerAdsTranslations.ts`: the `ads` locale namespace (`src/locales/*/ads.json`).
