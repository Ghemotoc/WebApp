/**
 * HubPrompt: the prompt of the week on the Writers' hub (bundle GAPS-12c; board WritersHub,
 * "Prompt of the week").
 *
 * The card shows this week's prompt in the reader's language, how many writers started a story
 * from it and how long it still runs, then "Write from this prompt" (the new-story screen, which
 * remembers the prompt) and "Another prompt", which pages through the earlier ones and back to
 * the first. An earlier prompt can still be written from; it only loses "ends in". With no prompt
 * yet the card stays away, so the hub never shows an empty box.
 * Who shows it: WritersHubPage. What it calls: useHubPrompts → writers_hub_prompts().
 */
import { useState } from 'react';
import { Link } from 'react-router';

import { Button } from '@/components/ui/Button';
import { buttonClassName } from '@/components/ui/buttonStyles';
import { Notice } from '@/components/ui/Notice';

import type { HubPrompt as HubPromptRow } from '../api/hubPrompts';
import { useHubPrompts } from '../hooks/useHubPrompts';
import { daysUntilClose } from '../lib/hubDates';
import { useHubTranslation } from '../registerHubTranslations';

/**
 * The small line under the prompt: how many writers tried it and, this week, how long it runs.
 *
 * @param props.prompt - the prompt shown
 * @param props.now - today, for the days left
 * @returns the line, or nothing when there is nothing to say yet
 */
function PromptFacts({ prompt, now }: { prompt: HubPromptRow; now: Date }) {
  const { t } = useHubTranslation();
  const facts: string[] = [];
  // Step 1: the count shows from the first writer, so a new prompt doesn't read "0 writers".
  if (prompt.writerCount > 0) facts.push(t('hub.prompt.tried', { count: prompt.writerCount }));
  // Step 2: only this week's prompt is still running.
  if (prompt.isCurrent) {
    const daysLeft = daysUntilClose(prompt.endsOn, now);
    facts.push(
      daysLeft === 0 ? t('hub.prompt.endsToday') : t('hub.prompt.endsIn', { count: daysLeft }),
    );
  }
  if (facts.length === 0) return null;
  return <p className="m-0 text-sm text-meta">{facts.join(' · ')}</p>;
}

/**
 * Renders the card.
 *
 * @param props.now - today, for the days left
 * @returns the card, a plain message when the prompts can't be read, or nothing without a prompt
 */
export function HubPrompt({ now }: { now: Date }) {
  const { t, i18n } = useHubTranslation();
  const { prompts, loadFailed } = useHubPrompts();
  // Which prompt shows: 0 is the newest; "Another prompt" moves to the next and wraps round.
  const [shownIndex, setShownIndex] = useState(0);
  if (loadFailed) return <Notice tone="error">{t('hub.prompt.loadFailed')}</Notice>;
  // The list can shrink while the card is open (staff delete one), so the index stays inside it.
  const prompt = prompts[shownIndex % Math.max(prompts.length, 1)];
  if (prompt === undefined) return null;
  const words = i18n.language === 'ro' ? prompt.promptRo : prompt.promptEn;
  return (
    <section
      aria-labelledby="hub-prompt"
      className="flex flex-col gap-4 rounded-card border border-border bg-surface p-6 shadow-card md:p-8"
    >
      <h2 id="hub-prompt" className="eyebrow m-0">
        {prompt.isCurrent ? t('hub.prompt.eyebrow') : t('hub.prompt.earlierEyebrow')}
      </h2>
      {/* Announced when "Another prompt" swaps the words, so a screen reader hears the new one. */}
      <p
        aria-live="polite"
        className="m-0 font-heading text-[clamp(22px,2.6vw,28px)] leading-snug font-bold break-words text-heading"
      >
        {words}
      </p>
      <PromptFacts prompt={prompt} now={now} />
      <div className="flex flex-wrap gap-3">
        <Link
          to={`/write/new?prompt=${prompt.promptId}`}
          className={buttonClassName({ variant: 'primary' })}
        >
          {t('hub.prompt.write')}
        </Link>
        {prompts.length > 1 && (
          <Button
            variant="secondary"
            onClick={() => setShownIndex((shownIndex + 1) % prompts.length)}
          >
            {t('hub.prompt.another')}
          </Button>
        )}
      </div>
    </section>
  );
}
