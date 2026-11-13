/**
 * ReplyTeacherPoints: teacher points under a reply in a class thread (bundle CLASS-POINTS, part 1;
 * story S1-E8-14: "an assignment reply or a chapter").
 *
 * What it shows:
 * - to the class's teacher, under a pupil's post (the teacher's own posts get none): a "Teacher points" button that opens the form
 *   in place (TeacherPointsForm), with the saved points beside it;
 * - to the pupil who wrote the reply: "Teacher points: 7" and the teacher's private note;
 * - to everyone else, and outside a class with points on: nothing.
 * Who shows it: ForumPostCard, under every reply. It asks once per thread, not once per reply:
 * every card of the thread shares the same cached answer.
 * What it calls: useThreadTeacherPoints → class_thread_teacher_points(); TeacherPointsForm →
 * set_teacher_points(), which refuses work that isn't a pupil's.
 */
import { useId, useState } from 'react';

import { Button } from '@/components/ui/Button';

import type { TeacherPoints, ThreadTeacherPoints } from '../api/classPoints';
import { useThreadTeacherPoints } from '../hooks/useClassPoints';
import { useClassPointsTranslation } from '../registerClassPointsTranslations';

import { TeacherPointsForm } from './TeacherPointsForm';
import { TeacherPointsShown } from './TeacherPointsShown';

/** What the part needs to know about the reply. */
export interface ReplyTeacherPointsProps {
  /** The thread's row ID, or null outside a space (then nothing is asked). */
  threadId: string | null;
  /** The reply's row ID and its number in the thread. */
  postId: string;
  postNumber: number;
  /** True when the reader wrote this reply. */
  isMine: boolean;
}

/**
 * Renders the part, or nothing.
 *
 * @returns the pupil's line, the teacher's button and form, or nothing
 */
export function ReplyTeacherPoints(props: ReplyTeacherPointsProps) {
  const { threadId, postId, postNumber, isMine } = props;
  const read = useThreadTeacherPoints(threadId ?? '', threadId !== null);
  const thread = read.data;
  if (thread === undefined || thread === null) return null;
  const saved = thread.byPostId[postId] ?? null;

  // The pupil reads the points on their own reply.
  if (!thread.isTeacher) {
    return isMine && saved !== null ? <TeacherPointsShown teacher={saved} /> : null;
  }
  // The teacher's own replies get no points, and a locked class changes nothing.
  if (isMine || thread.isLocked) return null;
  return <TeacherTools thread={thread} saved={saved} postId={postId} postNumber={postNumber} />;
}

/** What the teacher's tools need. */
interface TeacherToolsProps {
  thread: ThreadTeacherPoints;
  /** The points already saved on this reply, or null. */
  saved: TeacherPoints | null;
  postId: string;
  postNumber: number;
}

/**
 * The teacher's button, the saved points beside it and the form it opens.
 *
 * @returns the tools under the reply
 */
function TeacherTools({ thread, saved, postId, postNumber }: TeacherToolsProps) {
  const { t } = useClassPointsTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const regionId = useId();
  return (
    <div className="flex flex-col gap-3 border-t border-border pt-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="secondary"
          aria-expanded={isOpen}
          aria-controls={regionId}
          aria-label={t('reply.openFor', { number: postNumber })}
          onClick={() => setIsOpen(!isOpen)}
        >
          {t('reply.open')}
        </Button>
        {saved !== null && (
          <span className="text-sm font-semibold text-ink">
            {t('chapter.teacher.shown', { points: saved.points })}
          </span>
        )}
      </div>
      <div id={regionId} hidden={!isOpen}>
        {isOpen && (
          <TeacherPointsForm
            kind="reply"
            targetId={postId}
            current={saved}
            max={thread.teacherMax}
            areNotesOn={thread.areNotesOn}
            noteMax={thread.noteMax}
          />
        )}
      </div>
    </div>
  );
}
