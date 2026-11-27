/**
 * ClassThreads: the threads on a class page (bundle BOOKS-8; board G03-Class, user story 8.3).
 *
 * Who shows it: ClassSpaceContent, for a viewer who may read the class.
 * What it shows (board G03): "Threads" with "New thread" beside it for a member who may post,
 * then one plain list with hairlines, pinned threads first (the forum already sorts them so).
 * Homework carries its due moment (MUST-1d), so the old "Assignments" card is no longer needed.
 * What it calls: useThreadList → forum_thread_list(); useClassAssignments →
 * class_space_assignments() for the due moments; ClassThreadRow.
 */
import { Link } from 'react-router';

import { ActionIcon } from '@/components/icons/ActionIcon';
import { Button } from '@/components/ui/Button';
import { buttonClassName } from '@/components/ui/buttonStyles';
import { Notice } from '@/components/ui/Notice';
import { useThreadList } from '@/features/forums/hooks/useForumThreads';

import type { Space } from '../api/spaces';
import { useClassAssignments } from '../hooks/useClassAssignments';
import { useSpacesTranslation } from '../registerSpacesTranslations';

import { ClassThreadRow } from './ClassThreadRow';

/**
 * The due moment of each open homework, by thread number.
 *
 * @param slug - the class's address
 * @returns a map from thread number to its due moment
 */
function useDueMoments(slug: string): Map<number, string> {
  const assignments = useClassAssignments(slug).data ?? [];
  return new Map(assignments.map((assignment) => [assignment.number, assignment.dueAt]));
}

/**
 * Renders the threads.
 *
 * @param props.space - the class space
 * @returns the section
 */
export function ClassThreads({ space }: { space: Space }) {
  const { t } = useSpacesTranslation();
  const list = useThreadList(space.forumSlug);
  const dueMoments = useDueMoments(space.slug);
  // The teacher's New thread sits under the class's name instead (board G08, BOOKS-8b).
  const isTeacher = space.viewer.membership === 'owner';
  const canStart = space.viewer.canPost && !space.isLocked && !isTeacher;
  return (
    <section aria-labelledby="class-threads-heading" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="class-threads-heading" className="m-0 type-heading text-ink-heading">
          {t('classPage.threads')}
        </h2>
        {canStart && (
          <Link
            to={`/spaces/${space.slug}/new`}
            className={buttonClassName({ variant: 'secondary' })}
          >
            <ActionIcon name="plus" />
            {t('classPage.newThread')}
          </Link>
        )}
      </div>
      {list.loadFailed && <Notice tone="error">{t('classPage.threadsFailed')}</Notice>}
      {list.threads !== null && list.threads.length === 0 && (
        <p className="m-0 type-body text-ink-muted">{t('classPage.noThreads')}</p>
      )}
      {list.threads !== null && list.threads.length > 0 && (
        <ul className="m-0 flex list-none flex-col p-0" aria-label={t('classPage.threads')}>
          {list.threads.map((thread) => (
            <ClassThreadRow
              key={thread.number}
              forumSlug={space.forumSlug}
              thread={thread}
              dueAt={dueMoments.get(thread.number) ?? null}
            />
          ))}
        </ul>
      )}
      {list.hasMore && (
        <Button type="button" variant="text" onClick={list.showMore} disabled={list.isLoadingMore}>
          {t('classPage.moreThreads')}
        </Button>
      )}
    </section>
  );
}
