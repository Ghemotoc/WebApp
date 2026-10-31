/**
 * BackCoverPreview: "Back cover" on the Marketing page (story S1-E17-29: "when I open the
 * preview, then the title, logline, blurb and comps are laid out like a book's back cover, as
 * real text").
 *
 * A button that opens and closes the preview (aria-expanded), then a book-shaped panel in the
 * plum of the covers: the title, the logline as the line that sells it, the blurb and "For
 * readers of" with the comparable titles. All of it is real HTML text, never a picture, so it
 * reads aloud and zooms (Architecture 1.1 principle 8). Empty parts are left out, with a plain
 * line when there is nothing to show yet. No doodles: a working screen.
 * Who uses it: MarketingPage. What it calls: nothing; the page passes the saved text.
 */
import { useState } from 'react';

import { Button } from '@/components/ui/Button';

import { useAtlasTranslation } from '../registerAtlasTranslations';

/** The four pieces the back cover shows. */
export interface BackCoverText {
  title: string;
  logline: string;
  blurb: string;
  comparableTitles: string;
}

/** The book-shaped panel itself. */
function BackCover({ text }: { text: BackCoverText }) {
  const { t } = useAtlasTranslation();
  const hasWords = text.logline !== '' || text.blurb !== '' || text.comparableTitles !== '';
  return (
    <figure
      aria-labelledby="atlas-back-cover-title"
      data-testid="atlas-back-cover"
      className="m-0 flex w-full max-w-[440px] min-h-[560px] flex-col gap-5 self-center rounded-[6px] bg-primary px-8 py-10 text-on-primary shadow-card"
    >
      <p
        id="atlas-back-cover-title"
        className="m-0 font-heading text-[28px] leading-tight font-bold break-words"
      >
        {text.title}
      </p>
      {text.logline !== '' && (
        <p className="m-0 text-lg font-semibold break-words whitespace-pre-line">{text.logline}</p>
      )}
      {text.blurb !== '' && (
        <p className="m-0 text-[15px] leading-relaxed break-words whitespace-pre-line">
          {text.blurb}
        </p>
      )}
      {text.comparableTitles !== '' && (
        <p className="m-0 mt-auto text-sm break-words whitespace-pre-line">
          <span className="font-semibold">{t('marketing.backCover.forReadersOf')}</span>{' '}
          {text.comparableTitles}
        </p>
      )}
      {!hasWords && <p className="m-0 text-sm">{t('marketing.backCover.empty')}</p>}
    </figure>
  );
}

/**
 * Renders the button and, once opened, the back cover.
 *
 * @param props.text - the saved title, logline, blurb and comparable titles
 * @returns the "Back cover" section
 */
export function BackCoverPreview({ text }: { text: BackCoverText }) {
  const { t } = useAtlasTranslation();
  const [isOpen, setIsOpen] = useState(false);
  return (
    <section aria-labelledby="atlas-back-cover-heading" className="flex min-w-0 flex-col gap-4">
      <h2
        id="atlas-back-cover-heading"
        className="m-0 font-heading text-[22px] font-bold text-heading"
      >
        {t('marketing.backCover.heading')}
      </h2>
      <p className="m-0 text-sm text-meta">{t('marketing.backCover.hint')}</p>
      <Button
        variant="secondary"
        className="self-start"
        aria-expanded={isOpen}
        aria-controls="atlas-back-cover-panel"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? t('marketing.backCover.hide') : t('marketing.backCover.show')}
      </Button>
      <div id="atlas-back-cover-panel" className="flex flex-col" hidden={!isOpen}>
        {isOpen && <BackCover text={text} />}
      </div>
    </section>
  );
}
