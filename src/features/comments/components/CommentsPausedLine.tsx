/**
 * CommentsPausedLine: "New comments are paused until Saturday 21 November, 18:40, Romania time."
 * in place of the comment box while the writer has paused new comments (bundle CALM-8;
 * IDEA-20261109-8; the design handover's Step 4, "Pausing new comments", points 5, 6 and 8).
 *
 * The handover's values: plain text in the body colour, 15 px, with no box and no icon, the same
 * under the chapter and at the foot of a paragraph's thread. The story's writer sees "Resume now"
 * after it, a text button that ends the pause at once. Only the box and Reply go during a pause:
 * likes, reactions, Report and More stay (CommentItem hides Reply).
 * Who uses it: CommentsSection (under the chapter) and ParagraphThread (the thread's foot).
 * What it calls: useResumeComments → end_my_comment_pause(); formatRomaniaDayAndTime() for the end,
 * in Romania time like every date writers set.
 */
import { Button } from '@/components/ui/Button';
import type { ChapterAddress } from '@/features/reading/api/likes';
import { formatRomaniaDayAndTime } from '@/lib/romania-time';
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
 * @returns the button and the failure line
 */
function ResumeNow({ address }: { address: ChapterAddress }) {
  const { t } = useCommentsTranslation();
  const resume = useResumeComments(address);
  return (
    <>
      <Button variant="text" isLoading={resume.isResuming} onClick={resume.resume}>
        {t('section.resumeNow')}
      </Button>
      {resume.failure !== null && (
        <p role="alert" className="m-0 basis-full text-sm text-destructive">
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
}: CommentsPausedLineProps) {
  const { t, i18n } = useCommentsTranslation();
  // The end in Romania time, the way the switch in Story settings names it.
  const when = formatRomaniaDayAndTime(end, i18n.language);
  return (
    <div className={cn('flex flex-wrap items-center gap-x-3 gap-y-1', className)}>
      <p className="m-0 text-[15px] text-body">{t('section.paused', { when })}</p>
      {canResume && <ResumeNow address={address} />}
    </div>
  );
}
