/**
 * BioSettingsSection: "About you", the bio field in Settings › Account, with a link to one's own
 * profile (story S1-E5-05; board 6.3).
 *
 * Plain text, at most 300 characters (the story's proposal), with a live count announced
 * politely. The bio is public on the profile, and the hint says so. Read-only accounts are told
 * why saving is refused (the account gate).
 * Who shows it: SettingsPage, once the person has a username.
 * What it calls: useWriterProfile (to read the current bio) and useSaveBio → set_my_bio().
 * Before sending, usePersonalDetailsGate asks "Post anyway?" when the words look like contact
 * details (MUST-1b; PersonalDetailsGateNote); it never blocks.
 */
import { useState } from 'react';
import { usePeopleTranslation } from '@/features/people/registerPeopleTranslations';
import { Link } from 'react-router';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { Textarea } from '@/components/ui/Textarea';
import { bioMaxLength } from '@/features/people/api/writerProfile';
import { useSaveBio } from '@/features/people/hooks/useSaveBio';
import { useWriterProfile } from '@/features/people/hooks/useWriterProfile';
import { PersonalDetailsGateNote } from '@/features/privacy/components/PersonalDetailsNote';
import { usePersonalDetailsGate } from '@/features/privacy/hooks/usePersonalDetailsCheck';

/** What the form needs. */
interface BioFormProps {
  handle: string;
  savedBio: string;
  /** Kept by the section, so "Saved." survives the form starting again with the new bio. */
  saveBio: ReturnType<typeof useSaveBio>;
}

/** The form, once the current bio is known. */
function BioForm({ handle, savedBio, saveBio }: BioFormProps) {
  const { t } = usePeopleTranslation();
  const [bio, setBio] = useState(savedBio);
  const isTooLong = bio.trim().length > bioMaxLength;

  /** Saves the bio, unless it is too long (the field already says so). */
  async function saveNow() {
    if (!isTooLong) await saveBio.save(bio);
  }
  // MUST-1b: the bio is public, so it asks "Post anyway?" before contact details are saved.
  const gate = usePersonalDetailsGate({ text: bio, sendNow: saveNow });

  return (
    <form noValidate className="flex flex-col gap-3" onSubmit={gate.submit}>
      <Textarea
        id="settings-bio"
        label={t('settings.bioLabel')}
        hint={t('settings.bioHint', { max: bioMaxLength })}
        rows={4}
        value={bio}
        aria-invalid={isTooLong ? true : undefined}
        onChange={(event) => {
          saveBio.reset();
          gate.close();
          setBio(event.target.value);
        }}
      />
      <PersonalDetailsGateNote gate={gate} isSending={saveBio.isSaving} />
      <p
        aria-live="polite"
        className={`m-0 text-[13px] ${isTooLong ? 'text-destructive' : 'text-meta'}`}
      >
        {isTooLong
          ? t('settings.bioTooLong', { max: bioMaxLength })
          : t('settings.bioCount', { count: bio.trim().length, max: bioMaxLength })}
      </p>
      {saveBio.failure === 'read_only' && <Notice tone="error">{t('settings.bioReadOnly')}</Notice>}
      {saveBio.failure !== null && saveBio.failure !== 'read_only' && (
        <Notice tone="error">{t('settings.bioFailed')}</Notice>
      )}
      {saveBio.isSaved && <Notice tone="success">{t('settings.bioSaved')}</Notice>}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <Button
          type="submit"
          variant="secondary"
          disabled={saveBio.isSaving || bio.trim() === savedBio}
        >
          {saveBio.isSaving ? t('settings.bioSaving') : t('settings.bioSave')}
        </Button>
        <Link
          to={`/u/${encodeURIComponent(handle)}`}
          className="text-sm font-semibold text-link underline hover:text-link-hover"
        >
          {t('settings.viewProfile')}
        </Link>
      </div>
    </form>
  );
}

/**
 * Renders the section.
 *
 * @param props.handle - the signed-in person's username
 * @returns the section, once the current bio has loaded
 */
export function BioSettingsSection({ handle }: { handle: string }) {
  const { t } = usePeopleTranslation();
  const { profile } = useWriterProfile(handle);
  const saveBio = useSaveBio();
  return (
    <section
      aria-labelledby="settings-bio-heading"
      className="flex flex-col gap-3 rounded-card border border-border bg-surface p-6 shadow-card"
    >
      <h2 id="settings-bio-heading" className="m-0 font-heading text-[22px] font-bold text-heading">
        {t('settings.bioHeading')}
      </h2>
      {profile !== null && (
        <BioForm key={profile.bio} handle={handle} savedBio={profile.bio} saveBio={saveBio} />
      )}
    </section>
  );
}
