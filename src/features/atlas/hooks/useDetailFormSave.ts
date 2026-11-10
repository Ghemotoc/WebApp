/**
 * useDetailFormSave: the saving state and the message of one small form on the character sheet
 * ("Add detail", "Add a group of details", "Rename group"; bundle GAPS-1).
 *
 * It runs one save at a time, so a double click saves once (break test, 10 Nov 2026), and words
 * the message when a save fails: "that name is taken" when the database says so, the form's
 * general message for anything else.
 * Who calls it: AddDetailForm, AddDetailGroupForm and OwnDetailGroupSection. What it calls:
 * detailFailureKey in api/characterDetails.ts and the atlas translations.
 */
import { useState } from 'react';

import { detailFailureKey } from '../api/characterDetails';
import { useAtlasTranslation } from '../registerAtlasTranslations';

/** The form's general "that didn't save" messages, as keys in the atlas locale file. */
type FailedKey =
  | 'characters.details.failed'
  | 'characters.details.groupFailed'
  | 'characters.details.renameFailed';

/**
 * The state of one form.
 *
 * @returns message (what to show under the form, or null), isSaving (a save is on its way),
 *   say (shows a message, or clears it with null) and save (runs a change; resolves true when it
 *   saved, false when it didn't or when another save is still on its way)
 */
export function useDetailFormSave() {
  const { t } = useAtlasTranslation();
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  /** Runs the change unless one is already running, and words the message when it fails. */
  async function save(change: () => Promise<void>, failedKey: FailedKey): Promise<boolean> {
    // A second press while the first is still saving does nothing.
    if (isSaving) return false;
    setMessage(null);
    setIsSaving(true);
    try {
      await change();
      return true;
    } catch (error: unknown) {
      setMessage(t(detailFailureKey(error, failedKey)));
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  return { message, isSaving, say: setMessage, save };
}

/**
 * Says whether a name is one of the sheet's built-in cards ("Basics", "Look and voice", "Inside",
 * "In the story", "Custom fields") in the writer's language, capitals aside. A group of the
 * writer's own can't take one of those names, or the sheet would show two cards with one heading
 * (break test, 10 Nov 2026). The check lives here and not in the database because the built-in
 * names are interface text.
 *
 * @returns isBuiltInGroupName(name)
 */
export function useBuiltInGroupNames() {
  const { t } = useAtlasTranslation();
  const builtInNames = [
    t('characters.groups.basics'),
    t('characters.groups.lookAndVoice'),
    t('characters.groups.inside'),
    t('characters.groups.inTheStory'),
    t('characters.custom.heading'),
  ].map((name) => name.toLowerCase());
  return (name: string) => builtInNames.includes(name.trim().toLowerCase());
}
