/**
 * SearchPagePreview: one page's search result and share card, as Staff › Website › Search and
 * sharing shows them, with what is missing (story S1-E11-39; bundle SEO-1d).
 *
 * The search result is drawn the way search engines draw one: the site's address and the page's
 * path, the title with the site's name after it, and the description cut where results cut it.
 * The share card is drawn the way chat apps draw a large card: the picture, the site's address,
 * the title and the description. Both are plain HTML, never pictures of text, and the warnings
 * are a list with a plain sentence each.
 * Who shows it: SearchSharingTab. What it calls: the brand settings for the site's name and
 * address, and the websiteAdmin locale keys.
 */
import { useTranslation } from 'react-i18next';

import { brand } from '@/config/brand';
import { searchLengthGuide, shortenedAtWord } from '@/lib/searchWords';

import type { SearchPageReport } from '../../lib/searchPageReport';

/** What the preview needs. */
interface SearchPagePreviewProps {
  page: SearchPageReport;
}

/**
 * The <title> search results show, the way the server writes it.
 *
 * @param page - the page
 * @returns the title text
 */
function resultTitleOf(page: SearchPageReport): string {
  const { lead, withSiteName } = page.resultTitle;
  if (!withSiteName) return lead;
  return lead === '' ? brand.productName : `${lead} · ${brand.productName}`;
}

/**
 * The search result: address, title and description.
 *
 * @returns the drawn result
 */
function SearchResult({ page }: SearchPagePreviewProps) {
  const { t } = useTranslation('websiteAdmin');
  const title = resultTitleOf(page);
  const description = shortenedAtWord(page.words.description, searchLengthGuide.descriptionLongest);
  return (
    <figure className="m-0 flex flex-col gap-2">
      <figcaption className="text-sm font-bold text-heading">
        {t('searchSharing.searchResult')}
      </figcaption>
      <div className="flex flex-col gap-1 rounded-card border border-border bg-surface p-4">
        <span className="text-sm break-all text-meta">
          {brand.siteDomain}
          {page.address === '/' ? '' : ` › ${page.address.slice(1).replaceAll('/', ' › ')}`}
        </span>
        <span className="text-lg break-words text-link">{title}</span>
        <span className="text-sm break-words text-body">
          {description === '' ? t('searchSharing.noDescription') : description}
        </span>
      </div>
    </figure>
  );
}

/**
 * The share card: picture, address, title and description.
 *
 * @returns the drawn card
 */
function ShareCard({ page }: SearchPagePreviewProps) {
  const { t } = useTranslation('websiteAdmin');
  return (
    <figure className="m-0 flex max-w-[420px] flex-col gap-2">
      <figcaption className="text-sm font-bold text-heading">
        {t('searchSharing.shareCard')}
      </figcaption>
      <div className="overflow-hidden rounded-card border border-border bg-surface">
        {/* The picture is decorative here: the card's words below say what it stands for. */}
        <img src={page.sharePicture} alt="" className="block aspect-[1.91/1] w-full object-cover" />
        <div className="flex flex-col gap-1 p-4">
          <span className="text-xs text-meta uppercase">{brand.siteDomain}</span>
          <span className="font-bold break-words text-heading">
            {page.words.title === '' ? brand.productName : page.words.title}
          </span>
          {page.words.description !== '' && (
            <span className="text-sm break-words text-body">{page.words.description}</span>
          )}
        </div>
      </div>
    </figure>
  );
}

/**
 * Renders the warnings, the search result and the share card.
 *
 * @returns the preview
 */
export function SearchPagePreview({ page }: SearchPagePreviewProps) {
  const { t } = useTranslation('websiteAdmin');
  return (
    <div className="flex flex-col gap-5">
      {page.warnings.length === 0 ? (
        <p className="m-0 text-body">{t('searchSharing.allGood')}</p>
      ) : (
        <ul className="m-0 flex list-disc flex-col gap-1 pl-5 text-body">
          {page.warnings.map((warning) => (
            <li key={warning}>{t(`searchSharing.warnings.${warning}`, searchLengthGuide)}</li>
          ))}
        </ul>
      )}
      {page.words.isHidden && <p className="m-0 text-body">{t('searchSharing.hidden')}</p>}
      <div className="flex flex-wrap items-start gap-6">
        <SearchResult page={page} />
        <ShareCard page={page} />
      </div>
    </div>
  );
}
