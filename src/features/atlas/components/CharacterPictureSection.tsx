/**
 * CharacterPictureSection: a character's portrait or mood picture (story S1-E17-11).
 *
 * - No picture: the initials show ("images are blank by default").
 * - Choose a picture: it is prepared (location data out), uploaded, checked (CLAUDE.md rule 19)
 *   and shown once it passed; until then the section says it is being checked.
 * - The alt text saves by itself; Remove picture takes it off and deletes the file.
 * Uploads follow the picture check's switch (picture_uploads): while it is off, the upload field
 * isn't offered. Who uses it: CharacterSheet. What it calls: useStoryCast's uploadPicture and
 * removePicture (through the props), PictureUploadField from the pictures feature.
 */
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { useFeatureFlags } from '@/features/flags/hooks/useFeatureFlags';
import { FormSection } from '@/features/writing/components/FormSection';
import { PictureUploadError } from '@/features/pictures/api/pictures';
import { PictureUploadField } from '@/features/pictures/components/PictureUploadField';
import type { UploadOutcome } from '@/features/pictures/hooks/usePictureUpload';

import type { StoryCharacter } from '../api/characters';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { CharacterAvatar } from './CharacterAvatar';
import { PlanTextField } from './PlanTextField';

/** What the section needs. */
export interface CharacterPictureSectionProps {
  character: StoryCharacter;
  upload: (file: File) => Promise<string>;
  remove: () => Promise<void>;
  saveAlt: (alt: string) => Promise<void>;
}

/** What the upload field says, from the upload's result or error. */
function outcomeOf(status: string | undefined, error: Error | null): UploadOutcome | null {
  if (error !== null) {
    if (error instanceof PictureUploadError) {
      return { kind: 'failed', failure: error.failure, waitMinutes: error.waitMinutes };
    }
    return { kind: 'failed', failure: 'unreachable', waitMinutes: null };
  }
  return status === undefined ? null : { kind: 'uploaded', path: '', status };
}

/** The line under the picture that says where its check is. */
function PictureStateNote({ character }: { character: StoryCharacter }) {
  const { t } = useAtlasTranslation();
  const state = character.picture?.state;
  if (state === undefined)
    return <p className="m-0 text-sm text-meta">{t('characters.picture.none')}</p>;
  if (state === 'visible') return null;
  return <Notice tone="info">{t(`characters.picture.${state}`)}</Notice>;
}

/**
 * Renders the section.
 *
 * @returns the card with the picture or initials, the upload field, the alt text and Remove
 */
export function CharacterPictureSection({
  character,
  upload,
  remove,
  saveAlt,
}: CharacterPictureSectionProps) {
  const { t } = useAtlasTranslation();
  const { isOn } = useFeatureFlags();
  const [removeFailed, setRemoveFailed] = useState(false);
  const uploading = useMutation({ mutationFn: upload });
  const hasPicture = character.picture !== null;
  return (
    <FormSection legend={t('characters.picture.heading')}>
      <div className="flex flex-wrap items-center gap-4">
        <CharacterAvatar character={character} size="large" />
        <div className="min-w-0 flex-1 basis-48">
          <PictureStateNote character={character} />
        </div>
      </div>
      {isOn('picture_uploads', false) && (
        <PictureUploadField
          label={t('characters.picture.upload')}
          hint={t('characters.picture.hint')}
          isUploading={uploading.isPending}
          outcome={outcomeOf(uploading.data, uploading.error)}
          onPick={(file) => uploading.mutate(file)}
        />
      )}
      {hasPicture && (
        <>
          <PlanTextField
            id="atlas-character-picture-alt"
            label={t('characters.picture.alt')}
            hint={t('characters.picture.altHint')}
            maxLength={300}
            savedValue={character.pictureAlt}
            save={saveAlt}
          />
          <Button
            variant="secondary"
            className="self-start"
            onClick={() => void remove().catch(() => setRemoveFailed(true))}
          >
            {t('characters.picture.remove')}
          </Button>
        </>
      )}
      <div aria-live="polite">
        {removeFailed && <Notice tone="error">{t('characters.picture.removeFailed')}</Notice>}
      </div>
    </FormSection>
  );
}
