/**
 * CommentOrderSelect: "Newest first" or "Oldest first" beside the comments heading (BOOKS B05,
 * user story 2.5; board B05-ReaderEnd).
 *
 * Board values: a drop-down at the right of "212 comments", its label "Order of comments" read
 * by screen readers only. It is the shared Select, so it follows the one drop-down style.
 * Who uses it: CommentsSection, which keeps the order and passes it to useChapterComments.
 * What it calls: Select.
 */
import { Select } from '@/components/ui/Select';

import type { CommentOrder } from '../api/comments';
import { useCommentsTranslation } from '../registerCommentsTranslations';

/** What the drop-down needs. */
export interface CommentOrderSelectProps {
  order: CommentOrder;
  onChange: (order: CommentOrder) => void;
}

/**
 * Renders the order drop-down.
 *
 * @returns the labelled drop-down
 */
export function CommentOrderSelect({ order, onChange }: CommentOrderSelectProps) {
  const { t } = useCommentsTranslation();
  return (
    <Select
      id="comments-order"
      label={t('section.order')}
      options={[
        { value: 'newest', label: t('section.newestFirst') },
        { value: 'oldest', label: t('section.oldestFirst') },
      ]}
      value={order}
      // The two values above are the only ones the drop-down can send.
      onChange={(value) => onChange(value === 'oldest' ? 'oldest' : 'newest')}
    />
  );
}
