/**
 * RulesWalkthrough: four short rules cards (kindness, privacy, ratings, how to report or block)
 * shown under a comment or forum post box before an under-18's first post (bundle MUST-1, part c;
 * IDEA-20261108-7).
 *
 * One card at a time, with Back, Next and a way to skip; the last card has Done. The card's
 * heading takes the focus at each step, so a screen reader reads it. The words in the box above
 * are never touched, and the link to the full community guidelines opens in a new tab so leaving
 * to read them loses nothing. The cards' text is help pages in the CMS (useRulesWalkthrough), so
 * staff edit it in Website › Help in every language.
 * Who shows it: CommentComposer, ReplyForm and NewThreadForm, while the walkthrough isShown.
 * What it calls: CmsMarkdown for the card's text; the buttons call the walkthrough back.
 */
import { useEffect, useId, useRef, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { CmsMarkdown } from '@/features/website/components/CmsMarkdown';

import type { RulesWalkthroughState } from '../hooks/useRulesWalkthrough';
import { useSafetyTranslation } from '../registerSafetyTranslations';

/** Where the full community guidelines live (the legal centre). */
const guidelinesAddress = '/legal/guidelines';

/** What the walkthrough needs: its state, and what to do once it closes. */
export interface RulesWalkthroughProps {
  walkthrough: RulesWalkthroughState;
  /** Called after Skip or Done, to put the focus back in the box. */
  onClosed: () => void;
}

/**
 * The buttons under a card.
 *
 * @returns Back (after the first card), Skip (before the last) and Next or Done
 */
function CardButtons({
  step,
  total,
  onStep,
  onFinish,
}: {
  step: number;
  total: number;
  onStep: (next: number) => void;
  onFinish: () => void;
}) {
  const { t } = useSafetyTranslation();
  const isLast = step === total - 1;
  return (
    <div className="flex flex-wrap items-center gap-3">
      {step > 0 && (
        <Button variant="secondary" onClick={() => onStep(step - 1)}>
          {t('rulesWalkthrough.back')}
        </Button>
      )}
      {isLast ? (
        <Button onClick={onFinish}>{t('rulesWalkthrough.done')}</Button>
      ) : (
        <Button onClick={() => onStep(step + 1)}>{t('rulesWalkthrough.next')}</Button>
      )}
      {!isLast && (
        <Button variant="text" onClick={onFinish}>
          {t('rulesWalkthrough.skip')}
        </Button>
      )}
    </div>
  );
}

/**
 * Renders the walkthrough, or nothing while it is closed.
 *
 * @returns the card, its place in the four, the guidelines link and the buttons
 */
export function RulesWalkthrough({ walkthrough, onClosed }: RulesWalkthroughProps) {
  const { t } = useSafetyTranslation();
  const [step, setStep] = useState(0);
  const groupLabelId = useId();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const card = walkthrough.cards[step];

  // Move the focus to the card's heading when it opens and at each step, so it is read out.
  useEffect(() => {
    if (walkthrough.isShown) titleRef.current?.focus();
  }, [walkthrough.isShown, step]);

  if (!walkthrough.isShown || card === undefined) return null;

  /** Skip or Done: records it, closes it and sends the focus back to the box. */
  const finish = () => {
    walkthrough.finish();
    setStep(0);
    onClosed();
  };

  return (
    <div
      role="group"
      aria-labelledby={groupLabelId}
      className="flex flex-col gap-3 rounded-2xl border border-(--info-border) bg-(--info-bg) px-[18px] py-3.5 text-(--info-text)"
    >
      <p id={groupLabelId} className="m-0 text-sm">
        {t('rulesWalkthrough.intro')}{' '}
        <span className="font-semibold">
          {t('rulesWalkthrough.progress', { current: step + 1, total: walkthrough.cards.length })}
        </span>
      </p>
      <h3 ref={titleRef} tabIndex={-1} className="m-0 text-[17px] font-semibold outline-none">
        {card.title}
      </h3>
      <CmsMarkdown markdown={card.body} language={card.language} />
      <a
        href={guidelinesAddress}
        target="_blank"
        rel="noopener"
        className="inline-flex min-h-6 w-fit items-center font-semibold text-link underline"
      >
        {t('rulesWalkthrough.guidelines')}
      </a>
      <CardButtons
        step={step}
        total={walkthrough.cards.length}
        onStep={setStep}
        onFinish={finish}
      />
    </div>
  );
}
