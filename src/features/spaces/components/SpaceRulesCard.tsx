/**
 * SpaceRulesCard: "Space rules", numbered, then "The community guidelines apply here too" (bundle
 * FORUMS-2, part a; S1-E8-06 criterion 1; the board's side card).
 * Since CALM-9b (board simplified F08 and F09) it sits on the page, not on a panel: a
 * subheading, the owner's rules as a numbered list, the guidelines line in the meta colour and
 * the link to it as a text button. The "Set by the owner" eyebrow is gone (COPY-1: the heading
 * says it).
 * Who shows it: SpacePage and SpaceNewThreadPage. What it calls: nothing; the rules come with the
 * space.
 */
import { Link } from 'react-router';

import { buttonClassName } from '@/components/ui/buttonStyles';

import type { Space } from '../api/spaces';
import { useSpacesTranslation } from '../registerSpacesTranslations';

/**
 * Renders the section.
 *
 * @param props.space - the space
 * @returns the section with the owner's rules, or a note that there are none
 */
export function SpaceRulesCard({ space }: { space: Space }) {
  const { t } = useSpacesTranslation();
  return (
    <section aria-labelledby="space-rules-heading" className="flex flex-col gap-2">
      <h2 id="space-rules-heading" className="m-0 type-subheading">
        {t('rules.title')}
      </h2>
      {space.rules.length === 0 && <p className="m-0 text-body">{t('rules.none')}</p>}
      {space.rules.length > 0 && (
        <ol className="m-0 flex list-decimal flex-col gap-1.5 pl-5 break-words text-body">
          {space.rules.map((rule, index) => (
            <li key={`${index}-${rule}`}>{rule}</li>
          ))}
        </ol>
      )}
      {/* The link flush with the words above it, as on the board. */}
      <Link
        to="/legal/guidelines"
        className={`${buttonClassName({ variant: 'text' })} -ml-3 self-start`}
      >
        {t('rules.guidelines')}
      </Link>
    </section>
  );
}
