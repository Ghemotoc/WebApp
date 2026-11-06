/**
 * ClassArchiveCard: "Archive the class" in a class space's settings (bundle CLASSES, part d;
 * story S1-E8-11 criterion 8: "Given the academic year ends (or the teacher closes the space
 * earlier), when the space is archived, then it locks").
 *
 * What it shows: what archiving does, then "Archive the class", which asks once more before it
 * acts, because nobody can undo it. Once archived, the card only says so. Plain card style, no
 * doodles.
 * Who shows it: SpaceSettingsPage, for a class space, to whoever holds its settings power (the
 * teacher, a space moderator given it, our moderation team). The database checks again.
 * What it calls: useArchiveClass → archive_class_space().
 */
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';

import type { Space } from '../api/spaces';
import { useArchiveClass } from '../hooks/useClassTools';
import { useSpacesTranslation } from '../registerSpacesTranslations';

import { SpaceFormCard } from './SpaceFormCard';
import { errorShownByHook } from '@/lib/errorShownByHook';

/** The archive call, as useArchiveClass() gives it. */
type Archiving = ReturnType<typeof useArchiveClass>;

/**
 * The button, then the "for good" question with Yes and Cancel.
 *
 * @param props.archiving - the archive call
 * @returns the buttons
 */
function ArchiveButtons({ archiving }: { archiving: Archiving }) {
  const { t } = useSpacesTranslation();
  const [isAsking, setIsAsking] = useState(false);
  if (!isAsking) {
    return (
      <Button variant="secondary" className="self-start" onClick={() => setIsAsking(true)}>
        {t('classArchive.archive')}
      </Button>
    );
  }
  return (
    <div role="group" aria-label={t('classArchive.confirmLabel')} className="flex flex-col gap-3">
      <p className="m-0 font-semibold text-heading">{t('classArchive.confirm')}</p>
      <div className="flex flex-wrap gap-3">
        <Button
          variant="destructive"
          disabled={archiving.isRunning}
          onClick={() => void archiving.archive().catch(errorShownByHook)}
        >
          {t('classArchive.yes')}
        </Button>
        <Button variant="text" onClick={() => setIsAsking(false)}>
          {t('classArchive.cancel')}
        </Button>
      </div>
    </div>
  );
}

/**
 * Renders the card.
 *
 * @param props.space - the class space
 * @returns the card
 */
export function ClassArchiveCard({ space }: { space: Space }) {
  const { t } = useSpacesTranslation();
  const archiving = useArchiveClass(space.slug);
  return (
    <SpaceFormCard
      eyebrow={t('classArchive.eyebrow')}
      title={t('classArchive.title')}
      headingLevel="h2"
      headingId="class-archive-heading"
    >
      <div className="flex flex-col gap-4">
        {space.isArchived ? (
          <Notice tone="info">{t('classArchive.archived')}</Notice>
        ) : (
          <>
            <p className="m-0 text-body">{t('classArchive.intro')}</p>
            <ArchiveButtons archiving={archiving} />
          </>
        )}
        <div aria-live="polite">
          {archiving.failure !== null && (
            <Notice tone="error">{t(`classLock.failures.${archiving.failure.failure}`)}</Notice>
          )}
        </div>
      </div>
    </SpaceFormCard>
  );
}
