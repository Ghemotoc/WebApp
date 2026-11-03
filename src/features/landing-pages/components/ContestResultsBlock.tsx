/**
 * ContestResultsBlock: a contest's published winners and finalists at the end of its landing page
 * (story S1-E11-15 criterion 8; bundle CONTESTS-13b2b).
 *
 * Each result shows the writer's pen name only, never age, school or real name, and links to the
 * story when the visitor may open it (the database leaves the link out otherwise, for example for
 * a rating the visitor may not see). Winners come first. The headings are interface text; the
 * page's own words still come only from the CMS.
 * Who shows it: LandingPageView, after the blocks, when the page's extras carry results.
 */
import { Link } from 'react-router';

import type { LandingResult } from '@/schemas/landingPages';

import { useLandingPageTranslation } from '../registerLandingPageTranslations';

/** One list: the winners or the finalists. */
function ResultList({ heading, results }: { heading: string; results: LandingResult[] }) {
  const { t } = useLandingPageTranslation();
  if (results.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <h3 className="m-0 font-heading text-[20px] font-bold text-heading">{heading}</h3>
      <ul className="m-0 flex flex-col gap-2 pl-5">
        {results.map((result) => (
          <li key={`${result.pen_name}-${result.story?.slug ?? ''}`} className="text-body">
            <span className="font-semibold text-ink">{result.pen_name}</span>
            {result.story !== null && (
              <>
                {t('results.with')}
                <Link to={`/s/${result.story.slug}`} className="text-link underline">
                  {result.story.title}
                </Link>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Renders the results, or nothing when the list is empty.
 *
 * @param props.results - the published results, winners first
 * @returns the section
 */
export function ContestResultsBlock({ results }: { results: LandingResult[] }) {
  const { t } = useLandingPageTranslation();
  if (results.length === 0) return null;
  return (
    <section aria-labelledby="contest-results-heading" className="flex flex-col gap-4">
      <h2
        id="contest-results-heading"
        className="m-0 font-heading text-[26px] font-bold text-heading"
      >
        {t('results.heading')}
      </h2>
      <ResultList
        heading={t('results.winners')}
        results={results.filter((result) => result.placing === 'winner')}
      />
      <ResultList
        heading={t('results.finalists')}
        results={results.filter((result) => result.placing === 'finalist')}
      />
    </section>
  );
}
