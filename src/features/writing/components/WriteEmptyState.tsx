/**
 * WriteEmptyState: the Write page of a member with no story yet (board D04, user story 5.4).
 *
 * Three parts, one column at every size: the box (the one box surface, 24 px inside) with a
 * pencil in a tinted circle, "No stories yet", why it is empty and "New story" as the page's one
 * plum button; "Plan before you write", which opens the Story Atlas with a quiet button; and
 * "Guides for a first story" (FirstStoryGuides, CMS help pages). The story asks for no reader
 * numbers, followers graph or tables before the first chapter is out, and no Join a class notice
 * here: it lives in the footer's "Write and talk" on every page.
 * Who shows it: YourWritingPage, when the signed-in member has no live story. What it calls:
 * ActionIcon, buttonClassName and FirstStoryGuides.
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { ActionIcon } from '@/components/icons/ActionIcon';
import { buttonClassName } from '@/components/ui/buttonStyles';

import { FirstStoryGuides } from './FirstStoryGuides';

/** The box: the mark, the heading, the line and New story. */
function NoStoriesBox() {
  const { t } = useTranslation('writing');
  return (
    <section
      aria-labelledby="write-empty-heading"
      className="flex flex-col items-start gap-3 rounded-card border border-border bg-surface p-6"
    >
      <span
        aria-hidden="true"
        className="grid size-12 place-items-center rounded-full bg-tint text-ink-heading"
      >
        <ActionIcon name="pen" />
      </span>
      <h2 id="write-empty-heading" className="m-0 type-subheading text-ink-heading">
        {t('writeEmpty.title')}
      </h2>
      <p className="m-0 max-w-[46ch] type-body text-ink-muted">{t('writeEmpty.line')}</p>
      <Link to="/write/new" className={buttonClassName({ variant: 'primary' })}>
        <ActionIcon name="plus" />
        {t('writeEmpty.newStory')}
      </Link>
    </section>
  );
}

/** "Plan before you write": what the Atlas is for, and the way in. */
function PlanBeforeYouWrite() {
  const { t } = useTranslation('writing');
  return (
    <section aria-labelledby="write-empty-plan" className="flex flex-col items-start gap-3">
      <h2 id="write-empty-plan" className="m-0 type-heading text-ink-heading">
        {t('writeEmpty.plan.heading')}
      </h2>
      <p className="m-0 type-body">{t('writeEmpty.plan.line')}</p>
      <Link to="/plan" className={buttonClassName({ variant: 'secondary' })}>
        <ActionIcon name="map" />
        {t('writeEmpty.plan.open')}
      </Link>
    </section>
  );
}

/**
 * Renders the three parts.
 *
 * @returns the box, the Atlas section and the guides
 */
export function WriteEmptyState() {
  return (
    <>
      <NoStoriesBox />
      <PlanBeforeYouWrite />
      <FirstStoryGuides />
    </>
  );
}
