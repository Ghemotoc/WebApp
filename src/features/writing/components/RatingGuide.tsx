/**
 * RatingGuide: the four rating rows (who it is for, what it may contain) under the rating
 * chips, with the chosen one highlighted (story S1-E3-06; board NewStory 4.2, "Labels").
 *
 * Layout (liquid glass StorySettings board, bundle G9 WRITING, part d): one row per rating, the
 * rating's name in a 70 px column, then who it is for in bold and what it may contain under it;
 * the chosen row takes the selected tint. Under the rows, the rule for every rating ends with
 * "What the ratings mean", the how-to guide on ratings and labels (a CMS help page, G9a).
 * The wording is the board's, used as written; it is a proposal pending the lawyer (L14 in
 * docs/for-the-lawyer.md; Robert, 23 Oct 2026). The words live in src/locales/<lang>/writing.json
 * under labels.guide, so changing them never touches this file.
 * Who uses it: StoryLabelsSection.
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import type { StoryRating } from '@/schemas/story';
import { storyRatings } from '@/schemas/story';

/**
 * Renders the guide.
 *
 * @param chosen - the rating the writer picked, or null
 * @returns a list of the four ratings
 */
export function RatingGuide({ chosen }: { chosen: StoryRating | null }) {
  const { t } = useTranslation('writing');
  return (
    <div className="flex flex-col gap-3">
      <ul className="m-0 list-none overflow-hidden rounded-2xl border border-border p-0">
        {storyRatings.map((rating, index) => (
          <li
            key={rating}
            aria-current={rating === chosen ? 'true' : undefined}
            className={`flex items-start gap-4 px-3.5 py-2.5 ${
              index === 0 ? '' : 'border-t border-border'
            } ${rating === chosen ? 'bg-tint' : 'bg-surface'}`}
          >
            {/* The board's 70 px name column, so the four descriptions line up. */}
            <span className="w-[70px] flex-none text-[13px] font-bold text-heading">
              {t(`rating.${rating}`)}
            </span>
            <span className="flex min-w-0 flex-col gap-0.5 text-[13px] leading-normal">
              <span className="font-bold text-ink">{t(`labels.guide.${rating}.who`)}</span>
              <span className="text-body">{t(`labels.guide.${rating}.what`)}</span>
            </span>
          </li>
        ))}
      </ul>
      {/* The rule above every rating (16 Oct 2026; Q17), then the guide that explains them. */}
      <p className="m-0 text-[13px] leading-normal text-meta">
        {t('labels.guideRule')}{' '}
        <Link to="/help/how-to-ratings-and-labels" className="font-semibold text-link underline">
          {t('labels.ratingsLink')}
        </Link>
      </p>
    </div>
  );
}
