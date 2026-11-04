/**
 * HouseAdCreative: what one of our own house ads says and where it leads (bundle SPONSORS, part
 * a1; story S1-E12-01 and S1-E12-05 "a house ad for our own contest or landing page").
 *
 * A landing-page house ad shows the page's own title (from the CMS, in the reader's language) and
 * leads to /c/<address>. The three built-in ones (start writing, the classics, the forums) take
 * their words from the ads locale files. The layout follows the board's chapter banner: the words,
 * then a link styled as a chip (a link, because it goes to another page).
 * Who shows it: AdBox, inside a slot.
 */
import { Link } from 'react-router';

import type { SlotAd } from '@/schemas/ads';

import { useAdsTranslation } from '../registerAdsTranslations';

/** Where each built-in house ad leads. */
const builtInAddresses: Record<string, string> = {
  write: '/write/new',
  classics: '/classics',
  forums: '/forums',
};

/** The title, the link and the action's words of one house ad. */
interface HouseAdWords {
  title: string;
  address: string;
  action: string;
}

/**
 * Works out the words and the address of a house ad.
 *
 * @param ad - the ad from page_ads()
 * @param isRomanian - true when the interface is in Romanian
 * @param t - the ads translation function
 * @returns its words, or null for a kind this version doesn't know
 */
function houseAdWords(
  ad: SlotAd,
  isRomanian: boolean,
  t: ReturnType<typeof useAdsTranslation>['t'],
): HouseAdWords | null {
  // One of our landing pages: its own title, in the reader's language when it has one.
  if (ad.kind === 'landing' && ad.page_slug !== null) {
    const title = (isRomanian ? ad.title_ro : ad.title_en) ?? ad.title_ro ?? '';
    return { title, address: `/c/${ad.page_slug}`, action: t('house.landing.action') };
  }
  const address = builtInAddresses[ad.kind];
  if (address === undefined) return null;
  return { title: t(`house.${ad.kind}.title`), address, action: t(`house.${ad.kind}.action`) };
}

/**
 * Renders the ad's words and its link.
 *
 * @param props.ad - the house ad
 * @param props.isStacked - true in a narrow slot (a card, a side box or a portrait)
 * @returns the creative, or null when the kind is unknown
 */
export function HouseAdCreative({ ad, isStacked }: { ad: SlotAd; isStacked: boolean }) {
  const { t, i18n } = useAdsTranslation();
  const words = houseAdWords(ad, i18n.language.startsWith('ro'), t);
  if (words === null) return null;
  return (
    <>
      <span className={isStacked ? 'min-w-0' : 'min-w-0 flex-[1_1_200px]'}>
        <span className="block text-[15px] font-bold break-words text-ink">{words.title}</span>
        <span className="mt-0.5 block text-[13px] text-body">{t('house.from')}</span>
      </span>
      <Link
        to={words.address}
        className="inline-flex h-10 flex-none items-center rounded-full border border-control-border bg-surface px-4 text-sm font-semibold text-heading no-underline focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        {words.action}
      </Link>
    </>
  );
}
