/**
 * SpaceRulesCard: "Set by the owner" › "Space rules", numbered, then "The community guidelines
 * apply here too" (bundle FORUMS-2, part a; S1-E8-06 criterion 1; the board's side card).
 * Who shows it: SpacePage. What it calls: nothing; the rules come with the space.
 */
import { Link } from 'react-router';

import { Eyebrow } from '@/components/ui/Eyebrow';

import type { Space } from '../api/spaces';
import { useSpacesTranslation } from '../registerSpacesTranslations';

/**
 * Renders the card.
 *
 * @param props.space - the space
 * @returns the section with the owner's rules, or a note that there are none
 */
export function SpaceRulesCard({ space }: { space: Space }) {
  const { t } = useSpacesTranslation();
  return (
    <section
      aria-labelledby="space-rules-heading"
      className="flex flex-col gap-3 rounded-card border border-panel-border bg-panel px-6 py-5"
    >
      <Eyebrow>{t('rules.eyebrow')}</Eyebrow>
      <h2 id="space-rules-heading" className="m-0 font-heading text-2xl font-bold text-heading">
        {t('rules.title')}
      </h2>
      {space.rules.length === 0 && <p className="m-0 text-sm text-body">{t('rules.none')}</p>}
      {space.rules.length > 0 && (
        <ol className="m-0 flex list-decimal flex-col gap-2 pl-5 text-sm break-words text-body">
          {space.rules.map((rule, index) => (
            <li key={`${index}-${rule}`}>{rule}</li>
          ))}
        </ol>
      )}
      <Link
        to="/legal/guidelines"
        className="inline-flex min-h-6 items-center text-sm text-link underline"
      >
        {t('rules.guidelines')}
      </Link>
    </section>
  );
}
