/**
 * RemoveLanguageCard: "Remove this language" on a translation's page (bundle TRANSLATE-1c;
 * Robert, 16 Nov 2026).
 *
 * Two steps on the page itself: the button, then a question with "Yes, remove" and "Keep it".
 * Removing is undoable for 30 days from "Recently deleted" on the Write page, like any deleted
 * story (S1-E3-05), and the question says so. The original can't be removed here: deleting the
 * whole story stays in Story settings.
 * Who shows it: TranslateChaptersPage. What it calls: hooks/useEditionDetails.ts →
 * delete_my_story().
 */
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';

import { useRemoveLanguage } from '../hooks/useEditionDetails';
import { useStoryLanguagesTranslation } from '../registerStoryLanguagesTranslations';

/** What the card needs. */
export interface RemoveLanguageCardProps {
  editionSlug: string;
  firstEditionSlug: string;
  /** The language's own name, for "Remove English". */
  language: string;
}

/**
 * Renders the card.
 *
 * @returns the button, or the question once it was pressed
 */
export function RemoveLanguageCard(props: RemoveLanguageCardProps) {
  const { editionSlug, firstEditionSlug, language } = props;
  const { t } = useStoryLanguagesTranslation();
  const [isAsking, setIsAsking] = useState(false);
  const removal = useRemoveLanguage(editionSlug, firstEditionSlug);
  return (
    <section
      aria-labelledby="remove-language-heading"
      className="flex flex-col gap-3 rounded-card border border-border bg-surface p-6 shadow-card"
    >
      <h2
        id="remove-language-heading"
        className="m-0 font-heading type-long font-bold text-ink-heading"
      >
        {t('remove.heading')}
      </h2>
      <p className="m-0 type-body leading-relaxed text-ink-muted">
        {t('remove.body', { language })}
      </p>
      {!isAsking && (
        <div>
          <Button type="button" variant="secondary" onClick={() => setIsAsking(true)}>
            {t('remove.button', { language })}
          </Button>
        </div>
      )}
      {isAsking && (
        <div
          role="group"
          aria-labelledby="remove-language-question"
          className="flex flex-col gap-3"
        >
          <p id="remove-language-question" className="m-0 type-body font-semibold text-ink-heading">
            {t('remove.confirm', { language })}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="destructive"
              disabled={removal.isRemoving}
              onClick={removal.remove}
            >
              {t('remove.yes')}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setIsAsking(false)}>
              {t('remove.no')}
            </Button>
          </div>
        </div>
      )}
      {removal.failed && <Notice tone="error">{t('remove.failed')}</Notice>}
    </section>
  );
}
