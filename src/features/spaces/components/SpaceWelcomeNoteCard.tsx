/**
 * SpaceWelcomeNoteCard: "Welcome note" in Space settings (bundle 14d IDEAS-3, part d; idea
 * IDEA-20261102-6): the owner writes a short note that each new member sees once at the top of
 * the space.
 *
 * Who shows it: SpaceSettingsPage, for anyone holding the settings power (the owner, a moderator
 * given it, our moderation team). The database checks the power again and refuses a note over 500
 * characters or with HTML; the refusal shows here in plain words (criterion 2). An empty note
 * takes the note away.
 * What it calls: useSaveWelcomeNote → set_space_welcome_note().
 */
import { useId, useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { Textarea } from '@/components/ui/Textarea';

import type { Space } from '../api/spaces';
import { welcomeNoteMaxCharacters } from '../api/spaceWelcome';
import { useSaveWelcomeNote } from '../hooks/useSpaceWelcome';
import { spaceFailureText } from '../lib/spaceFailures';
import { useSpacesTranslation } from '../registerSpacesTranslations';

import { SpaceFormCard } from './SpaceFormCard';

/**
 * Renders the card.
 *
 * @param props.space - the space; its viewer.welcomeNote fills the field
 * @returns the card with the field, Save and the saved or refused note
 */
export function SpaceWelcomeNoteCard({ space }: { space: Space }) {
  const { t } = useSpacesTranslation();
  const fieldId = useId();
  const saving = useSaveWelcomeNote(space.slug);
  const [note, setNote] = useState(space.viewer.welcomeNote ?? '');
  const [isSaved, setIsSaved] = useState(false);

  /** Saves the note, then says so; a refusal shows from saving.failure. */
  async function save(event: FormEvent) {
    event.preventDefault();
    setIsSaved(false);
    const saved = await saving.run(note).then(
      () => true,
      () => false,
    );
    setIsSaved(saved);
  }

  return (
    <SpaceFormCard
      eyebrow={t('welcome.eyebrow')}
      title={t('welcome.title')}
      intro={t('welcome.intro')}
      headingLevel="h2"
      headingId="space-welcome-heading"
    >
      <form className="flex flex-col gap-4" onSubmit={save}>
        <Textarea
          id={fieldId}
          label={t('welcome.label')}
          hint={t('welcome.hint', {
            count: note.trim().length,
            limit: welcomeNoteMaxCharacters,
          })}
          value={note}
          className="min-h-28"
          onChange={(event) => setNote(event.target.value)}
        />
        <Button type="submit" className="self-start" disabled={saving.isRunning}>
          {t('welcome.save')}
        </Button>
        <div aria-live="polite">
          {saving.failure !== null && (
            <Notice tone="error">{t(...spaceFailureText(saving.failure))}</Notice>
          )}
          {isSaved && saving.failure === null && (
            <Notice tone="success">{t('welcome.saved')}</Notice>
          )}
        </div>
      </form>
    </SpaceFormCard>
  );
}
