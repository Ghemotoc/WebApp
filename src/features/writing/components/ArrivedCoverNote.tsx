/**
 * ArrivedCoverNote: "Your new cover from Canva is here", with the cover, in Story settings
 * (bundle IDEAS-2, part d; idea IDEA-20261101-11).
 *
 * Shown once a cover saved in another tab has come into the form (useArrivingCover). The cover is
 * drawn by StoryCoverArt, so while it is in its picture check the writer sees "Waiting for a
 * check", as everywhere else (criterion 2). The line is announced politely, because it appears
 * when the writer comes back to the tab, not after something they did on this page.
 * Who shows it: StorySettingsPage, under the cover section. What it calls: StoryCoverArt.
 */
import { useTranslation } from 'react-i18next';

import { automaticCoverFor } from '@/components/covers/automaticCover';
import { DrawnCover } from '@/components/covers/DrawnCover';
import { StoryCoverArt } from '@/features/pictures/components/StoryCoverArt';

/** What the note needs: the story it is for. */
interface ArrivedCoverNoteProps {
  story: { id: string; slug: string; title: string };
}

/**
 * Renders the note with the new cover.
 *
 * @returns the note
 */
export function ArrivedCoverNote({ story }: ArrivedCoverNoteProps) {
  const { t } = useTranslation('writing');
  return (
    <div
      role="status"
      className="flex items-start gap-4 rounded-[14px] border border-border bg-panel p-4"
    >
      <StoryCoverArt
        story={{ slug: story.slug, coverKind: 'upload' }}
        className="w-[96px] shrink-0"
        drawn={
          <DrawnCover
            title={story.title}
            choice={automaticCoverFor(story.id)}
            size="tile"
            isDecorative
            className="w-[96px] shrink-0"
          />
        }
      />
      <p className="m-0 min-w-0 flex-1 text-[15px] text-body">{t('canva.arrived')}</p>
    </div>
  );
}
