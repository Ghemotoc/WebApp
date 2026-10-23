/**
 * RatingGuide: the four rating rows (who it is for, what it may contain) under the rating
 * chips, with the chosen one highlighted (story S1-E3-06; board NewStory 4.2, "Labels").
 *
 * The wording is the board's, used as written; it is a proposal pending the lawyer (L14 in
 * docs/for-the-lawyer.md; Robert, 23 Oct 2026). The words live in src/locales/<lang>/writing.json
 * under labels.guide, so changing them never touches this file.
 * Who uses it: StoryLabelsSection.
 */
import { useTranslation } from 'react-i18next';

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
      <ul className="m-0 list-none overflow-hidden rounded-card border border-border p-0">
        {storyRatings.map((rating, index) => (
          <li
            key={rating}
            aria-current={rating === chosen ? 'true' : undefined}
            className={`flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-3 ${
              index === 0 ? '' : 'border-t border-border'
            } ${rating === chosen ? 'bg-tint' : 'bg-surface'}`}
          >
            <span className="text-sm font-bold text-heading">{t(`rating.${rating}`)}</span>
            <span className="text-[13px] font-semibold text-ink">
              {t(`labels.guide.${rating}.who`)}
            </span>
            <span className="w-full text-[13px] leading-normal text-body">
              {t(`labels.guide.${rating}.what`)}
            </span>
          </li>
        ))}
      </ul>
      {/* The rule above every rating (16 Oct 2026; Q17). */}
      <p className="m-0 text-[13px] leading-normal text-meta">{t('labels.guideRule')}</p>
    </div>
  );
}
