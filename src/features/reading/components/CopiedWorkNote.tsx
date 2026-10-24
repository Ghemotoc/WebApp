/**
 * CopiedWorkNote: the public note on a story whose copying of a published work a moderator
 * confirmed (story S1-E10-08). Shown only after the decision "Add a public note"; before it,
 * nothing public changes. Needs the lawyer's review before launch.
 *
 * Who shows it: StoryPage, above the story's header. What it calls: useCopiedWorkNote.
 */
import { useTranslation } from 'react-i18next';

import { Notice } from '@/components/ui/Notice';

import { useCopiedWorkNote } from '../hooks/useCopiedWorkNote';

/**
 * Renders the note, or nothing.
 *
 * @param props.storyId - the story's ID
 * @returns the note
 */
export function CopiedWorkNote({ storyId }: { storyId: string }) {
  const { t } = useTranslation('reading');
  const { hasNote } = useCopiedWorkNote(storyId);
  if (!hasNote) return null;
  return <Notice tone="warning">{t('storyPage.copiedWorkNote')}</Notice>;
}
