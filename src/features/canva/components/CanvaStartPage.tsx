/**
 * CanvaStartPage: /canva/start?story=<story ID>, the page "Design it in Canva" opens in a new tab
 * (story S1-E3-12 criteria 1 and 4), as board D10 draws it (BOOKS D10, user story 5.10).
 *
 * What it shows: "Opening Canva…" as the heading while our server answers, with the line on what
 * opens (a blank design at cover size), then the tab leaves for Canva (its consent page the first
 * time, the new design after that). Under it, "If something stops it": the two things that can
 * stop the trip and what to do (CanvaStopRows). If the trip stops here, the heading says why.
 * Who shows it: the router. What it calls: useCanvaStart, CanvaTripPage, CanvaStopRows.
 */
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';

import { useCanvaStart, type CanvaStartState } from '../hooks/useCanvaStart';

import { CanvaStopRows } from './CanvaStopRows';
import { CanvaTripPage } from './CanvaTripPage';

/** The heading and the line for each state of the start. */
interface StartWords {
  heading: string;
  line: string;
}

/**
 * Words for the state: opening (and waiting) say what opens; the others say why it stopped.
 *
 * @returns the heading and the line
 */
function useStartWords(start: CanvaStartState): StartWords {
  const { t } = useTranslation('writing');
  if (start.kind === 'signed_out') {
    return { heading: t('canva.stoppedHeading'), line: t('canva.signedOut') };
  }
  if (start.kind === 'not_found') {
    return { heading: t('canva.stoppedHeading'), line: t('canva.failed.storyNotFound') };
  }
  if (start.kind === 'failed') {
    return { heading: t('canva.stoppedHeading'), line: t(start.message.key, start.message.values) };
  }
  return { heading: t('canva.opening'), line: t('canva.openingLine') };
}

/**
 * Renders the page.
 *
 * @returns the page
 */
export function CanvaStartPage() {
  const [params] = useSearchParams();
  const start = useCanvaStart(params.get('story') ?? '');
  const words = useStartWords(start);
  // The way back needs the story's slug, which the start knows once it has found the story.
  const backSlug = start.kind === 'opening' || start.kind === 'failed' ? start.slug : null;
  return (
    <CanvaTripPage heading={words.heading} line={words.line} backSlug={backSlug}>
      <CanvaStopRows />
    </CanvaTripPage>
  );
}
