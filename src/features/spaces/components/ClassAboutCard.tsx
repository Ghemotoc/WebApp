/**
 * ClassAboutCard: "How a class space starts" and "When the school year ends", beside a class
 * space's threads (bundle CLASSES, part b; story S1-E8-11; board ClassSpace).
 *
 * What it shows: the three steps (the Teacher badge, "Class space" on the form, students join
 * with the code), then what happens at the end of the school year and, when the class has a lock
 * date, the day it locks. Plain words, no doodles, the same panel style as the rules card.
 * Who shows it: SpacePage, in the side column of a class space.
 * What it calls: lockDateText() in api/classTools.ts for the date.
 */
import { Eyebrow } from '@/components/ui/Eyebrow';

import { lockDateText } from '../api/classTools';
import type { Space } from '../api/spaces';
import { useSpacesTranslation } from '../registerSpacesTranslations';

/** The three steps, by their locale keys (board ClassSpace). */
const steps = ['step1', 'step2', 'step3'] as const;

/**
 * Renders the card.
 *
 * @param props.space - the class space
 * @returns the card
 */
export function ClassAboutCard({ space }: { space: Space }) {
  const { t, i18n } = useSpacesTranslation();
  return (
    <section
      aria-labelledby="class-about-heading"
      className="flex flex-col gap-3 rounded-card border border-panel-border bg-panel px-6 py-5"
    >
      <Eyebrow>{t('classSpace.eyebrow')}</Eyebrow>
      <h2 id="class-about-heading" className="m-0 font-heading text-2xl font-bold text-heading">
        {t('classSpace.howTitle')}
      </h2>
      <ol className="m-0 flex list-decimal flex-col gap-2 pl-5 text-sm text-body">
        {steps.map((step) => (
          <li key={step}>
            <strong className="text-heading">{t(`classSpace.${step}Title`)}</strong>{' '}
            {t(`classSpace.${step}Text`)}
          </li>
        ))}
      </ol>
      <h3 className="m-0 mt-2 font-heading text-lg font-bold text-heading">
        {t('classSpace.yearEndTitle')}
      </h3>
      <p className="m-0 text-sm text-body">{t('classSpace.yearEndText')}</p>
      {space.locksAt !== null && !space.isLocked && (
        <p className="m-0 text-sm text-body">
          {t('classSpace.locksOn', { date: lockDateText(space.locksAt, i18n.language) })}
        </p>
      )}
    </section>
  );
}
