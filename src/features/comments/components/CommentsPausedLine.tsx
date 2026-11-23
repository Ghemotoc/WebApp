/**
 * CommentsPausedLine: "New comments are paused until Saturday 21 November, 18:40."
 * in place of the comment box while the writer has paused new comments (bundle CALM-8;
 * IDEA-20261109-8; the design handover's Step 4, "Pausing new comments", points 5, 6 and 8).
 *
 * The handover's values: plain text in the body colour, 15 px, with no box and no icon, the same
 * under the chapter and at the foot of a paragraph's thread. The story's writer sees "Resume now"
 * after it, a text button that ends the pause at once. Only the box and Reply go during a pause:
 * likes, reactions, Report and More stay (CommentItem hides Reply). Once "Resume now" has worked,
 * the comment box comes back where this line was; onResumed lets the parent give it the focus, so
 * a keyboard or screen reader user isn't left on a button that has gone (WCAG 2.4.3).
 * Who uses it: CommentsSection (under the chapter) and ParagraphThread (the thread's foot).
 * What it calls: useResumeComments → end_my_comment_pause(); formatLocalDayAndTime() for the end,
 * in the viewer's own local time (CALM-8b; Robert, design canvas comment, 20 Nov 2026, 17:49 UTC).
 */
import { Button } from '@/components/ui/Button';
import type { ChapterAddress } from '@/features/reading/api/likes';
import { formatLocalDayAndTime } from '@/lib/local-time';
import { cn } from '@/lib/utils';

import { useResumeComments, type ResumeFailure } from '../hooks/useResumeComments';
import { useCommentsTranslation } from '../registerCommentsTranslations';

/** What the line needs. */
export interface CommentsPausedLineProps {
  /** The chapter it sits under; "Resume now" ends the pause on its story. */
  address: ChapterAddress;
  /** When new comments open again. */
  end: Date;
  /** True for the story's writer (can_resume_comments), who gets "Resume now". */
  canResume: boolean;
  /** Spacing from what sits above it. */
  className?: string;
  /** Called once "Resume now" has ended the pause, so the parent can focus the box that returns. */
  onResumed?: () => void;
}

/** The words for each way "Resume now" can fail. */
const failureKeys: Record<ResumeFailure, string> = {
  not_active: 'section.resumeNotActive',
  other: 'section.resumeFailed',
};

/**
 * "Resume now" and, when it fails, why, on a line of its own.
 *
 * @param props.address - the chapter, whose story's pause ends
 * @param props.onResumed - called once the pause has ended
 * @returns the button and the failure line
 */
function ResumeNow({ address, onResumed }: Pick<CommentsPausedLineProps, 'address' | 'onResumed'>) {
  const { t } = useCommentsTranslation();
  const resume = useResumeComments(address, onResumed);
  return (
    <>
      <Button variant="text" isLoading={resume.isResuming} onClick={resume.resume}>
        {t('section.resumeNow')}
      </Button>
      {resume.failure !== null && (
        <p role="alert" className="m-0 basis-full type-body text-destructive">
          {t(failureKeys[resume.failure])}
        </p>
      )}
    </>
  );
}

/**
 * Renders the paused line, with "Resume now" for the writer.
 *
 * @returns the line
 */
export function CommentsPausedLine({
  address,
  end,
  canResume,
  className,
  onResumed,
}: CommentsPausedLineProps) {
  const { t, i18n } = useCommentsTranslation();
  // The end in the viewer's own local time, the way the switch in Story settings names it.
  const when = formatLocalDayAndTime(end, i18n.language);
  return (
    <div className={cn('flex flex-wrap items-center gap-x-3 gap-y-1', className)}>
      <p className="m-0 type-body text-ink-muted">{t('section.paused', { when })}</p>
      {canResume && <ResumeNow address={address} onResumed={onResumed} />}
    </div>
  );
}
