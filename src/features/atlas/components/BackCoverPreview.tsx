/**
 * BackCoverPreview: "Back cover" on the Marketing page (story S1-E17-29: "when I open the
 * preview, then the title, logline, blurb and comps are laid out like a book's back cover, as
 * real text"; redrawn by user stories bundle 6, story 6.13, board E32: "Back cover shows and hides
 * the preview").
 *
 * A section between hairlines, as board E32 draws it: the heading, a line saying what it shows,
 * a quiet "Back cover" button that shows and hides the preview (aria-expanded; open at first),
 * then the preview on the story paper: the title, the logline in the reading font as the line
 * that sells it, the blurb, "For readers of" with the comparable titles, and the writer's pen name
 * with the product's name (GAPS-2b). All of it is real HTML text, never a picture, so it reads
 * aloud and zooms (Architecture 1.1 principle 8). Empty parts are left out, with a plain line
 * when there is nothing to show yet.
 * Who uses it: MarketingPage. What it calls: MarketingSection; the page passes the saved text.
 */
import { useState } from 'react';

import { Button } from '@/components/ui/Button';

import { useAtlasTranslation } from '../registerAtlasTranslations';

import { MarketingSection } from './MarketingSection';

/** The pieces the back cover shows. */
export interface BackCoverText {
  title: string;
  logline: string;
  blurb: string;
  comparableTitles: string;
  /** The writer's pen name (or username), or '' while it isn't known. */
  writerName: string;
}

/** The preview itself: board E32's .backcover, at most 420 px wide, 32 px inside. */
function BackCover({ text }: { text: BackCoverText }) {
  const { t } = useAtlasTranslation();
  const hasWords = text.logline !== '' || text.blurb !== '' || text.comparableTitles !== '';
  return (
    <figure
      aria-labelledby="atlas-back-cover-title"
      data-testid="atlas-back-cover"
      className="m-0 flex w-full max-w-[420px] flex-col rounded-cover border border-border bg-story-paper p-8 text-story-ink"
    >
      <p
        id="atlas-back-cover-title"
        className="m-0 font-heading type-heading font-bold break-words text-story-ink"
      >
        {text.title}
      </p>
      {text.logline !== '' && (
        <p className="m-0 mt-3 font-[family-name:var(--font-story)] type-body break-words whitespace-pre-line italic">
          {text.logline}
        </p>
      )}
      {text.blurb !== '' && (
        <p className="m-0 mt-4 font-[family-name:var(--font-story)] type-body break-words whitespace-pre-line">
          {text.blurb}
        </p>
      )}
      {!hasWords && <p className="m-0 mt-4 type-body">{t('marketing.backCover.empty')}</p>}
      {text.comparableTitles !== '' && (
        <>
          <p className="m-0 mt-4 type-meta">{t('marketing.backCover.forReadersOf')}</p>
          <p className="m-0 type-label break-words whitespace-pre-line">{text.comparableTitles}</p>
        </>
      )}
      {text.writerName !== '' && (
        <p data-testid="atlas-back-cover-byline" className="m-0 mt-4 type-meta break-words">
          {t('marketing.backCover.byline', { name: text.writerName })}
        </p>
      )}
    </figure>
  );
}

/**
 * Renders the section and, while it is open, the back cover.
 *
 * @param props.text - the saved title, logline, blurb and comparable titles, and the writer's name
 * @returns the "Back cover" section
 */
export function BackCoverPreview({ text }: { text: BackCoverText }) {
  const { t } = useAtlasTranslation();
  const [isOpen, setIsOpen] = useState(true);
  return (
    <MarketingSection id="atlas-back-cover-heading" heading={t('marketing.backCover.heading')}>
      <p className="m-0 type-meta text-ink-muted">{t('marketing.backCover.hint')}</p>
      <Button
        variant="secondary"
        className="self-start"
        aria-expanded={isOpen}
        aria-controls="atlas-back-cover-panel"
        onClick={() => setIsOpen(!isOpen)}
      >
        {t('marketing.backCover.toggle')}
      </Button>
      <div id="atlas-back-cover-panel" className="flex flex-col" hidden={!isOpen}>
        {isOpen && <BackCover text={text} />}
      </div>
    </MarketingSection>
  );
}
