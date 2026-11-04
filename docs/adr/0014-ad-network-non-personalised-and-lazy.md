# ADR 0014: Ad-network ads load only in view, are never personalised and stay off until GO-LIVE

- **Date:** 4 November 2026
- **Status:** Proposed by the builder (SPONSORS-d, S1-E12-04). Robert chose Google AdSense in limited-ads mode on 2 November 2026. The flag `ad_network` stays off until GO-LIVE.

## Decision
Unsold wide banner slots can show an ad from Google AdSense, under these rules.

- **The server decides where.** `page_ads()` fills each slot in this order: a matching sponsor, then our own landing pages, then the network (when it is on), then our other house ads. The network only gets a wide banner, at most once per page. It never gets a card, a side box or a portrait, never anything inside chapter text, never a full-screen ad, and nothing in a class space or a class-only story (Q70). It is labelled "Ad" / "Reclamă".
- **Nothing loads until the slot is seen.** `NetworkAdCreative` waits for the slot to come into view (`IntersectionObserver`). Only then does it add `pagead2.googlesyndication.com/pagead/js/adsbygoogle.js` to the page, once per page.
- **Never personalised.** Every request sets `requestNonPersonalizedAds = 1`, for every reader of every age. The server sends nothing about the reader. The ad carries only the publisher ID and the ad unit.
- **Off until it is real.** It needs three things at once: the flag `ad_network` on, `ad_network_publisher_id` set (`ca-pub-` and 16 digits) and `ad_network_slot_id` set (the ad unit's digits). Today the flag is off and both settings are empty.
- **Never blank.** If the script can't load (an ad blocker, offline), the slot shows our "Start writing" ad instead.

## Why
- Rule 7 in CLAUDE.md says no third-party scripts or cookies without an ADR. This record is that ADR.
- Loading only in view keeps the script off pages where nobody sees the slot.
- The story's legal note: even non-personalised ads from big networks may use cookies or device storage for frequency capping and fraud checks. That needs consent under ePrivacy art. 5(3) and would end our "no cookie banner" position. Google says limited-ads mode avoids cookies and device storage for ads. If that can't be confirmed when the account is opened, the flag stays off and every slot keeps showing our own ads (the story's proposal).

## Consequences (GO-LIVE steps, after the company exists)
1. Open the AdSense account in the company's name and switch on limited ads for it. Before relying on it, check Google's current documentation: does limited-ads mode really set no cookie and read no device storage?
2. Copy every category from Staff › Sponsors › "Never advertised" into AdSense's blocking controls: gambling, tobacco and nicotine, alcohol, politics, dating, weight loss and anything staff add. AdSense can't read our list, so it has to be kept in step by hand.
3. Add Google to the processor list and the privacy notice, with its data processing terms and the transfer mechanism. Ask the lawyer about DSA art. 26 and 28(2).
4. Set `ad_network_publisher_id` and `ad_network_slot_id` in Staff › Settings, then turn on `ad_network`.
5. Run the third-party check in the browser (S1-E14-03) on a page with a network ad and confirm that no cookie is set. If one is, turn the flag off again.

- `scripts/check-third-party.ts` lists `pagead2.googlesyndication.com` as reviewed.
- Part f switches the network off on stories whose writer ticked sexual content, nudity or graphic violence. Sponsors are unaffected.
- AdSense can still decline to fill a slot. The slot then stays the network's empty box until part e watches for an unfilled ad. Noted as a follow-up.
