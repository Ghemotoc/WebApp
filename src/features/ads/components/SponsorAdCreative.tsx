/**
 * SponsorAdCreative: what a sponsor's ad shows inside a slot (bundle SPONSORS, part b3; story
 * S1-E12-02; board AdFormats "Banner after a chapter" and "In a list").
 *
 * The checked picture with its alt text, the sponsor's name, its one line in the reader's
 * language, an optional discount code with a Copy button, and the link to the sponsor's site. The
 * link opens in a new tab and is marked rel="sponsored" (paid links must say so). Nothing here
 * reads anything about the reader. The "Sponsored" pill is drawn by AdBox, never by the creative.
 * Each time it appears it counts one impression, and following the link counts one click (part c;
 * S1-E12-03), with nothing about the reader.
 * Who shows it: AdBox, for an ad whose kind is 'sponsor'.
 * What it calls: useSponsorPicture() for the picture's address, DiscountCode and
 * useSponsorImpression() / countSponsorEvent().
 */
import type { SlotAd } from '@/schemas/ads';

import { countSponsorEvent, useSponsorImpression } from '../hooks/useSponsorCounting';
import { useSponsorPicture } from '../hooks/useSponsorPicture';
import { useAdsTranslation } from '../registerAdsTranslations';

import { DiscountCode } from './DiscountCode';

/** A sponsor's words in the reader's language, Romanian when the other is missing. */
function sponsorWords(ad: SlotAd, isRomanian: boolean) {
  const line = (isRomanian ? ad.text_ro : ad.text_en) || ad.text_ro || ad.text_en || '';
  const alt = (isRomanian ? ad.alt_ro : ad.alt_en) || ad.alt_ro || ad.alt_en || '';
  return { line, alt };
}

/**
 * The picture, at the slot's size, or nothing while it loads or when Storage refuses it.
 *
 * @returns the image
 */
function SponsorPicture({ ad, alt, isStacked }: { ad: SlotAd; alt: string; isStacked: boolean }) {
  const address = useSponsorPicture(ad.picture_bucket ?? null, ad.picture_path ?? null).data;
  if (address === null || address === undefined) return null;
  return (
    <img
      src={address}
      alt={alt}
      loading="lazy"
      className={
        isStacked
          ? 'aspect-[4/3] w-full rounded-xl object-cover'
          : 'h-[72px] w-24 flex-none rounded-xl object-cover max-[700px]:h-14 max-[700px]:w-[74px]'
      }
    />
  );
}

/**
 * Renders the creative.
 *
 * @param props.ad - the sponsor's ad from page_ads()
 * @param props.isStacked - true in a narrow slot (a card, a side box or a portrait)
 * @returns the creative
 */
export function SponsorAdCreative({ ad, isStacked }: { ad: SlotAd; isStacked: boolean }) {
  const { t, i18n } = useAdsTranslation();
  const words = sponsorWords(ad, i18n.language.startsWith('ro'));
  // Step 1: one impression each time the ad appears (S1-E12-03).
  useSponsorImpression(ad.key);
  return (
    <>
      <SponsorPicture ad={ad} alt={words.alt} isStacked={isStacked} />
      <span className={isStacked ? 'min-w-0' : 'min-w-0 flex-[1_1_200px]'}>
        <span className="block text-[15px] font-bold break-words text-ink">{words.line}</span>
        <span className="mt-0.5 block text-[13px] text-body">
          {t('sponsor.from', { name: ad.sponsor_name ?? '' })}
        </span>
        {ad.discount_code != null && <DiscountCode code={ad.discount_code} />}
      </span>
      {ad.link_url != null && (
        <a
          href={ad.link_url}
          target="_blank"
          rel="sponsored nofollow noopener noreferrer"
          onClick={() => countSponsorEvent(ad.key, 'click')}
          className="inline-flex h-10 flex-none items-center rounded-full border border-control-border bg-surface px-4 text-sm font-semibold text-heading no-underline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {t('sponsor.visit')}
          <span className="sr-only"> {t('sponsor.newTab')}</span>
        </a>
      )}
    </>
  );
}
