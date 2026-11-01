/**
 * EpubSection: "An EPUB for e-readers" inside Download my stories, shown only when the chosen
 * story is the writer's own and Completed (story S1-E13-05, PRIVACY part f; Robert, 1 Nov 2026,
 * 06:31: "When a story is completed, they can also choose to download this as EPUB … only
 * writers can do that").
 *
 * A heading, a line on what the book holds (and that the Atlas isn't in it), "Make an EPUB",
 * which opens EpubDialog, and after a book is saved, a line naming the file. The dialog is drawn
 * afresh each time it opens, so the name is filled in again and never kept between books.
 * Who shows it: DownloadMyStoriesBlock. What it calls: useMakeEpub, useMyNames and EpubDialog.
 */
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { useMyNames } from '@/features/account/hooks/useMyNames';

import { useMakeEpub, type EpubStory } from '../hooks/useMakeEpub';
import type { EpubForm } from '../lib/runEpub';
import { useDataExportTranslation } from '../registerDataExportTranslations';

import { EpubDialog } from './EpubDialog';

/**
 * Renders the section.
 *
 * @param story - the completed story the writer chose
 * @returns the section
 */
export function EpubSection({ story }: { story: EpubStory }) {
  const { t } = useDataExportTranslation();
  const { names } = useMyNames();
  const { state, make } = useMakeEpub(story);
  const [isOpen, setIsOpen] = useState(false);
  // A new key each time the dialog opens, so its form starts fresh (the name is never kept).
  const [openCount, setOpenCount] = useState(0);
  const suggestedName = names?.penName ?? names?.handle ?? '';

  /** Makes the book, closing the dialog once it is saved. */
  async function makeBook(form: EpubForm) {
    if (await make(form)) setIsOpen(false);
  }

  return (
    <section
      aria-labelledby="epub-heading"
      className="flex flex-col gap-2.5 rounded-2xl bg-tint px-4.5 py-4"
    >
      <h4 id="epub-heading" className="m-0 font-heading text-lg font-bold text-heading">
        {t('epub.heading')}
      </h4>
      <p className="m-0 text-[15px] leading-relaxed text-body">{t('epub.intro')}</p>
      <div>
        <Button
          variant="secondary"
          onClick={() => {
            setOpenCount((count) => count + 1);
            setIsOpen(true);
          }}
        >
          {t('epub.open')}
        </Button>
      </div>
      <div aria-live="polite">
        {state.phase === 'saved' && !isOpen && (
          <Notice tone="success">{t('epub.saved', { fileName: state.fileName })}</Notice>
        )}
      </div>
      {isOpen && (
        <EpubDialog
          key={openCount}
          isOpen={isOpen}
          story={story}
          suggestedName={suggestedName}
          state={state}
          onMake={(form) => void makeBook(form)}
          onClose={() => setIsOpen(false)}
        />
      )}
    </section>
  );
}
