/**
 * NewChapterButton: "Write chapter one" on a story card that has no chapter yet (story
 * S1-E3-02a; board 4.1).
 *
 * What it does: calls create_chapter(slug) and opens the editor on the new chapter; a read-only
 * account or a failed call shows a plain message under the buttons.
 * Who uses it: WriterStoryCard ("Write chapter one") and Manage chapters ("+ New chapter",
 * S1-E3-04), which passes its own label, icon and size.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

import { Button } from '@/components/ui/Button';
import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';

import { createChapter } from '../api/chapters';
import { myStoriesKey } from '../hooks/useMyStories';

/** What the button needs: the story, and optionally its own words, icon and size. */
export interface NewChapterButtonProps {
  slug: string;
  /** The button's words; "Write chapter one" when left out. */
  label?: string;
  /** A small icon before the words (Manage chapters' plus). */
  icon?: ReactNode;
  size?: 'md' | 'lg';
}

/**
 * Renders the button.
 *
 * @returns the button and, when something went wrong, the message
 */
export function NewChapterButton({ slug, label, icon, size = 'md' }: NewChapterButtonProps) {
  const { t } = useTranslation('writing');
  const { userId } = useSession();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const create = useMutation({
    mutationFn: async () => createChapter(await requireClient(), slug),
    onSuccess: async (result) => {
      if (result.outcome !== 'ok') return;
      await queryClient.invalidateQueries({ queryKey: myStoriesKey(userId) });
      await navigate(`/write/s/${slug}/c/${result.code}`);
    },
  });
  const failed = create.isError || (create.data !== undefined && create.data.outcome !== 'ok');
  return (
    <>
      <Button size={size} onClick={() => create.mutate()} disabled={create.isPending}>
        {icon}
        {label ?? t('storyCard.writeChapterOne')}
      </Button>
      {failed && (
        <p role="alert" className="m-0 w-full text-sm text-destructive">
          {create.data?.outcome === 'not_active'
            ? t('newStory.notActive')
            : t('errors.chapterCreateFailed')}
        </p>
      )}
    </>
  );
}
