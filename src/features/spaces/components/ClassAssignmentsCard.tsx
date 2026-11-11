/**
 * ClassAssignmentsCard: "Assignments" on a class space's page, the threads with a due date still
 * to come, soonest first (bundle MUST-1, part d; IDEA-20261108-8).
 *
 * Each row links to the thread and says when it is due ("Due Friday 14 Nov"); the ones the reader
 * has replied to carry a "Replied" pill (text, not colour alone). With no open assignment the card
 * stays away, so a class that doesn't use due dates sees nothing new.
 * Who shows it: SpacePage, above the threads of a class space the viewer may read.
 * What it calls: useClassAssignments → class_space_assignments(); dueDayText.
 */
import { Link } from 'react-router';

import { InfoPill } from '@/components/ui/InfoPill';
import { Notice } from '@/components/ui/Notice';

import type { Space } from '../api/spaces';
import { useClassAssignments } from '../hooks/useClassAssignments';
import { dueDayText } from '../lib/assignmentDue';
import { useSpacesTranslation } from '../registerSpacesTranslations';

/**
 * Renders the card.
 *
 * @param props.space - the class space
 * @returns the list, an error note, or nothing
 */
export function ClassAssignmentsCard({ space }: { space: Space }) {
  const { t, i18n } = useSpacesTranslation();
  const read = useClassAssignments(space.slug);
  if (read.isError) return <Notice tone="error">{t('classAssignments.loadFailed')}</Notice>;
  const assignments = read.data ?? [];
  if (assignments.length === 0) return null;
  return (
    <section
      aria-labelledby="class-assignments-heading"
      className="flex flex-col gap-3 rounded-card border border-border bg-surface px-6 py-5 shadow-card"
    >
      <h2
        id="class-assignments-heading"
        className="m-0 font-heading text-2xl font-bold text-heading"
      >
        {t('classAssignments.title')}
      </h2>
      <ul className="m-0 flex list-none flex-col p-0">
        {assignments.map((assignment) => (
          <li
            key={assignment.number}
            className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-border py-3 last:border-b-0"
          >
            <Link
              to={`/forums/${assignment.forumSlug}/${assignment.number}`}
              className="min-w-0 font-semibold text-link underline [overflow-wrap:anywhere]"
            >
              {assignment.title}
            </Link>
            <span className="flex flex-wrap items-center gap-2 text-sm text-body">
              {t('classAssignments.due', { day: dueDayText(assignment.dueOn, i18n.language) })}
              {assignment.hasReplied && (
                <InfoPill tone="sage">{t('classAssignments.replied')}</InfoPill>
              )}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
