/**
 * WordTargetField: the story's word target, a whole number that saves by itself (story
 * S1-E17-03; S1-E17-01: 90,000 to start with).
 *
 * The writer types digits; the box keeps what they typed, and only a whole number from 1 to
 * 5,000,000 (the database's own range, story_plans_word_target_range) is saved. Anything else
 * waits with a plain message. Who uses it: StoryDetailsSection.
 */
import { TextInput } from '@/components/ui/TextInput';

import { useAutosaveField } from '../hooks/useAutosaveField';
import { wordTargetFrom } from '../lib/wordTarget';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { SaveNote } from './SaveNote';

/**
 * Renders the box and its note.
 *
 * @returns the labelled box
 */
export function WordTargetField({
  savedTarget,
  save,
}: {
  savedTarget: number;
  save: (target: number) => Promise<void>;
}) {
  const { t } = useAtlasTranslation();
  const field = useAutosaveField({
    savedValue: String(savedTarget),
    save: async (typed: string) => {
      // isValid has already checked it, so the number is there.
      await save(wordTargetFrom(typed) ?? savedTarget);
    },
    isValid: (typed) => wordTargetFrom(typed) !== null,
  });
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <TextInput
        id="atlas-word-target"
        label={t('details.wordTarget')}
        inputMode="numeric"
        className="w-40"
        value={field.value}
        aria-describedby="atlas-word-target-save"
        onChange={(event) => field.change(event.target.value)}
        onBlur={() => void field.flush()}
      />
      <SaveNote
        id="atlas-word-target-save"
        status={field.status}
        invalidMessage={t('details.wordTargetInvalid')}
      />
    </div>
  );
}
