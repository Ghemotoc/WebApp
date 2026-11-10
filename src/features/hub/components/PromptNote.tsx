/**
 * PromptNote: on the new-story screen, the writing prompt the story is being started from
 * (bundle GAPS-12c). It shows when the writer came from the hub's "Write from this prompt"
 * (/write/new?prompt=<ID>), so the prompt stays in sight while they name the story.
 *
 * Who shows it: NewStoryPage. What it calls: useHubPrompts, the same list the hub card reads.
 * An ID that isn't one of the started prompts shows nothing.
 */
import { useSearchParams } from 'react-router';

import { promptIdFrom } from '../api/hubPrompts';
import { useHubPrompts } from '../hooks/useHubPrompts';
import { useHubTranslation } from '../registerHubTranslations';

/**
 * Renders the note.
 *
 * @returns the prompt in the reader's language under a small label, or nothing
 */
export function PromptNote() {
  const { t, i18n } = useHubTranslation();
  const [searchParams] = useSearchParams();
  const { prompts } = useHubPrompts();
  // Step 1: the ID from the address, checked before it is used.
  const promptId = promptIdFrom(searchParams.get('prompt'));
  // Step 2: only a prompt the hub shows has words to show here.
  const prompt = prompts.find((candidate) => candidate.promptId === promptId);
  if (prompt === undefined) return null;
  return (
    <div className="flex max-w-[640px] flex-col gap-1.5 rounded-card bg-tint p-5">
      <p className="eyebrow m-0">{t('hub.prompt.writingFrom')}</p>
      <p className="m-0 text-lg leading-normal break-words text-ink">
        {i18n.language === 'ro' ? prompt.promptRo : prompt.promptEn}
      </p>
    </div>
  );
}
