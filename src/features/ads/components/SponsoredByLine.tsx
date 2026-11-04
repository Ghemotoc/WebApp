/**
 * SponsoredByLine: "Sponsored by <sponsor>" under a category's heading or on a contest's page
 * (bundle SPONSORS, part b3; story S1-E12-02 criterion 3; board AdFormats "Sponsored by").
 *
 * It names the sponsor and, when the campaign has one, links to the sponsor's site (marked as
 * sponsored, so search engines don't count it, and opened in a new tab). It changes nothing else:
 * the list's order and contents are the same with or without a sponsor. While the answer loads,
 * or when it fails or nobody sponsors the page, it shows nothing: a missing credit is never an
 * error a reader needs to see.
 * Who shows it: StoryListHeader (a category) and LandingPageScreen (a contest page).
 * What it calls: useSponsorCredit().
 */
import { useSponsorCredit } from '../hooks/useSponsorCredit';
import { useAdsTranslation } from '../registerAdsTranslations';
import type { SponsorCreditKind } from '../api/ads';

/** What the line needs. */
interface SponsoredByLineProps {
  kind: SponsorCreditKind;
  /** The category's or the contest page's slug. */
  slug: string;
}

/**
 * Renders the line, or nothing.
 *
 * @returns the line
 */
export function SponsoredByLine({ kind, slug }: SponsoredByLineProps) {
  const { t } = useAdsTranslation();
  const credit = useSponsorCredit(kind, slug).data ?? null;
  if (credit === null) return null;
  // The sponsor's name is a link only when the campaign gave one.
  const name =
    credit.link_url === null ? (
      <span className="font-semibold text-heading">{credit.sponsor_name}</span>
    ) : (
      <a
        href={credit.link_url}
        target="_blank"
        rel="sponsored nofollow noopener noreferrer"
        className="font-semibold text-link underline-offset-2"
      >
        {credit.sponsor_name}
        <span className="sr-only"> {t('sponsor.newTab')}</span>
      </a>
    );
  return (
    <p className="m-0 text-sm text-body" data-sponsored-by="">
      {t('sponsor.by')} {name}
    </p>
  );
}
