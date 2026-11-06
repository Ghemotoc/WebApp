/**
 * SpaceWelcomeNote: the owner's welcome note at the top of a space, with "Got it" (bundle 14d
 * IDEAS-3, part d; idea IDEA-20261102-6, criterion 1: each new member sees it once).
 *
 * Who shows it: SpacePage, above the threads. It shows only while the database says so
 * (viewer.showWelcome: a member who hasn't pressed "Got it" yet; never the owner). The note is
 * plain text: line breaks stay, nothing in it is read as HTML.
 * What it calls: useDismissWelcomeNote → dismiss_space_welcome().
 */
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';

import type { Space } from '../api/spaces';
import { useDismissWelcomeNote } from '../hooks/useSpaceWelcome';
import { spaceFailureText } from '../lib/spaceFailures';
import { useSpacesTranslation } from '../registerSpacesTranslations';
import { errorShownByHook } from '@/lib/errorShownByHook';

/**
 * Renders the note.
 *
 * @param props.space - the space
 * @returns the note with "Got it", or nothing
 */
export function SpaceWelcomeNote({ space }: { space: Space }) {
  const { t } = useSpacesTranslation();
  const dismissing = useDismissWelcomeNote(space.slug);
  const note = space.viewer.welcomeNote;
  if (!space.viewer.showWelcome || note === null) return null;
  return (
    <section
      aria-labelledby="space-welcome-note-heading"
      className="flex flex-col gap-3 rounded-card border border-border bg-surface px-6 py-5"
    >
      <h2
        id="space-welcome-note-heading"
        className="m-0 font-heading text-xl font-bold text-heading"
      >
        {t('welcome.noteTitle', { space: space.name })}
      </h2>
      <p className="m-0 text-[15px] break-words whitespace-pre-line text-body">{note}</p>
      <Button
        className="self-start"
        disabled={dismissing.isRunning}
        onClick={() => void dismissing.run().catch(errorShownByHook)}
      >
        {t('welcome.gotIt')}
      </Button>
      {dismissing.failure !== null && (
        <Notice tone="error">{t(...spaceFailureText(dismissing.failure))}</Notice>
      )}
    </section>
  );
}
