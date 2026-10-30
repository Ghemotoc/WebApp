/**
 * AvatarSettingsSection: "Profile picture" in Settings (story S1-E10-05; board 6.3).
 *
 * Shows the current picture (or an empty circle) and the upload field. A new picture replaces the
 * old one on the profile only once it passes the check; until then the person sees it with
 * "Waiting for a check" and everyone else keeps seeing the old one (CLAUDE.md rule 19).
 * Shown only while picture_uploads is on.
 * Who shows it: SettingsPage, once the person has a username. What it calls: useFeatureFlags,
 * usePictureUpload, AvatarImage, PictureUploadField.
 */
import { useTranslation } from 'react-i18next';

import { useFeatureFlags } from '@/features/flags/hooks/useFeatureFlags';

import { usePictureUpload } from '../hooks/usePictureUpload';

import { AvatarImage } from './AvatarImage';
import { PictureUploadField } from './PictureUploadField';

/**
 * Renders the section, or nothing while uploads are off.
 *
 * @param props.handle - the signed-in person's username
 * @returns the section, or null
 */
export function AvatarSettingsSection({ handle }: { handle: string }) {
  const { t } = useTranslation();
  const { isOn } = useFeatureFlags();
  const { upload, outcome, isUploading } = usePictureUpload({
    bucket: 'avatars',
    folder: null,
    kind: 'avatar',
  });
  if (!isOn('picture_uploads', false)) return null;
  return (
    <section
      aria-labelledby="settings-avatar-heading"
      className="flex flex-col gap-4 rounded-card border border-border bg-surface p-6 shadow-card"
    >
      <h2
        id="settings-avatar-heading"
        className="m-0 font-heading text-[22px] font-bold text-heading"
      >
        {t('pictures.avatarHeading')}
      </h2>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        {/* The picture is decorative: the heading and the field say what it is. */}
        <span
          aria-hidden="true"
          className="relative inline-flex size-24 flex-none rounded-full border border-border bg-panel"
        >
          <AvatarImage handle={handle} />
        </span>
        <div className="min-w-0 flex-1">
          <PictureUploadField
            label={t('pictures.avatarLabel')}
            hint={t('pictures.avatarHint')}
            isUploading={isUploading}
            outcome={outcome}
            onPick={upload}
          />
        </div>
      </div>
    </section>
  );
}
