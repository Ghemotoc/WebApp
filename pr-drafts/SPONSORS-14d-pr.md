<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Part of #120

Bundle 14 SPONSORS, part d: ad-network ads that are never personalised (S1-E12-04), using Google AdSense as you chose on 2 Nov. It's all built, but it stays switched off until GO-LIVE. This branch sits on top of #321 (and so on #320, #319 and #318). It targets #321's branch until those merge, and then main. Part f, which switches the network off for certain ratings, will close the issue.

## What changed

- **Where it may show** (criterion 2): only in a wide banner slot, at most once per page, labelled "Ad" / "Reclamă". Each slot fills in this order:
  1. a matching sponsor;
  2. our own landing pages;
  3. the network;
  4. our other house ads.
  
  It never shows in a card, a side box or a portrait, never inside chapter text, never full screen, and never in a class space or a class-only story.
- **Nothing loads until the slot is seen** (criterion 2): the AdSense script is added only when the banner comes into view, once per page. Every request asks for non-personalised ads, for every reader of every age (criterion 1). The server sends nothing about the reader, only the publisher ID and the ad unit.
- **Never blank:** if the script can't load (an ad blocker, offline), the slot shows our "Start writing" ad instead.
- **Off until it's real:** the new `ad_network` flag is off, and `ad_network_publisher_id` and `ad_network_slot_id` are empty. All three are needed, and the database checks that the IDs have the right shape.
- **"Why this ad?"** for a network ad: "This ad comes from Google's ad network, which we set to never personalise ads and to leave out the categories we block, such as alcohol and gambling."
- **Criteria 3 and 4:** a new ADR (0014) records the no-cookie question and the GO-LIVE steps, and `pagead2.googlesyndication.com` is now a reviewed host in the third-party check. If Google can't promise limited-ads mode sets no cookie, the flag stays off and every slot keeps our own ads, as the story proposes.
- **Records:** the decision log row (a proposal), the code tour and the ads README.

## How it was tested

- Database test `274-ad-network` (9 tests) covers:
  - off by default, with no publisher ID, or with a malformed ID;
  - once set up, Discover's and Search's wide banners show it labelled "ad", while the card and the portrait stay ours;
  - the ad carries only the account and the ad unit;
  - none in a class-only story;
  - a signed-in teenager gets exactly what a visitor gets;
  - a live landing page of ours comes first.
- Unit test for the "Why this ad?" sentence.
- The new e2e test `ad-network.spec.ts`, which uses a stub so the real script is never fetched:
  - with the network off, no request goes to Google;
  - switched on, the banner says "Ad", and the script is requested only after the banner scrolls into view, with only the publisher ID;
  - `requestNonPersonalizedAds` is 1;
  - when the script is blocked, the slot shows "Start writing".
- `sponsored-ads` and `ads` e2e ran unchanged.

## Local check run

LOCALRUN

## By hand

- Nothing now. The GO-LIVE steps are in ADR 0014:
  - open AdSense in the company's name and switch on limited ads;
  - copy our blocked categories into AdSense's blocking controls;
  - name Google in the processor list and the privacy notice;
  - set the two IDs, then turn the flag on;
  - check in a browser that no cookie is set.

## Questions for Robert

None blocking. Whether limited-ads mode truly sets no cookie can only be checked once the account exists, so that check is on the GO-LIVE list.

## Follow-ups

- AdSense can decline to fill a slot, which leaves an empty box. Part e can watch for that and show a house ad instead.
- Part f: the network switches off on stories whose writer ticked sexual content, nudity or graphic violence.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
