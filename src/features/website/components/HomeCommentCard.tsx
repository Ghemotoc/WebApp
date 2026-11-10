/**
 * HomeCommentCard: one real reader comment on the home page's cover wall (bundle GAPS-13; story
 * S1-E5-13; board Website-Home, "A paragraph comment, the way readers talk to writers here").
 *
 * Shows who wrote it, the paragraph it was left on, the comment and the story and chapter. It
 * is a comment staff picked and whose reader agreed to show it here; the database decides which
 * one (home_comment_card(): adults only, public stories rated All ages or 13+, never a spoiler)
 * and the card stays away when there is none or the read fails.
 * Who shows it: HeroCollage, at the wall's bottom left. What it calls: useHomeComment,
 * PersonAvatar and HomeCommentWords (the comment's words, sanitised, never with a link).
 */
import { useTranslation } from 'react-i18next';

import { PersonAvatar } from '@/features/avatars/components/PersonAvatar';

import { useHomeComment } from '../hooks/useHomeComment';

import { HomeCommentWords } from './HomeCommentWords';

/** Where the card goes: over the wall's bottom left corner, or in the page's flow under it. */
const placementClasses = {
  onWall: 'absolute bottom-2 left-0 z-10',
  underWall: 'relative mt-6',
} as const;

/** What the card needs. */
interface HomeCommentCardProps {
  placement: keyof typeof placementClasses;
}

/**
 * Renders the card.
 *
 * @param props.placement - onWall for a wall of two rows, underWall for a single row
 * @returns the card, or nothing without a comment to show
 */
export function HomeCommentCard({ placement }: HomeCommentCardProps) {
  const { t } = useTranslation();
  const { comment } = useHomeComment();
  if (comment === null) return null;
  // "on paragraph 4" while the paragraph is still there; otherwise only that they commented.
  const where =
    comment.paragraphNumber === null
      ? t('website.homeComment.commented')
      : t('website.homeComment.onParagraph', { number: comment.paragraphNumber });
  return (
    <figcaption
      aria-label={t('website.homeComment.label')}
      className={`${placementClasses[placement]} flex w-[290px] max-w-[70%] rotate-2 flex-col gap-2 rounded-[20px] border border-border bg-surface-solid px-[18px] py-4 shadow-[0_24px_44px_-20px_rgba(38,20,46,0.45)]`}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <PersonAvatar name={comment.displayName} handle={comment.handle} size="small" />
        <p className="m-0 min-w-0 text-[13px] wrap-anywhere text-meta">
          <b className="text-heading">{comment.displayName}</b> {where}
        </p>
      </div>
      <HomeCommentWords
        text={comment.body}
        className="m-0 text-[15px] leading-[1.45] wrap-anywhere text-heading"
      />
      <p className="m-0 text-xs wrap-anywhere text-meta">
        {t('website.homeComment.place', {
          story: comment.storyTitle,
          position: comment.chapterPosition,
        })}
      </p>
    </figcaption>
  );
}
