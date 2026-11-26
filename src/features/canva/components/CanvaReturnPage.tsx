/**
 * CanvaReturnPage: /canva/return, where Canva sends the tab back (story S1-E3-12), as board D11
 * draws it (BOOKS D11, user story 5.11).
 *
 * What it shows, for each way back (useCanvaReturn), as the heading and the line under it:
 * "Talking to Canva…" while it works, "Nothing was shared" after a no on Canva's consent page,
 * "The cover is saved" after Return (with "Waiting for a check" above it while the picture check
 * runs, and the cover's place beside it), or "Something went wrong" with the plain reason.
 * "Back to story settings" is the page's main action.
 * Who shows it: the router. What it calls: useCanvaReturn, CanvaTripPage.
 */
import { useTranslation } from 'react-i18next';

import { ActionIcon } from '@/components/icons/ActionIcon';

import { useCanvaReturn, type CanvaReturnState } from '../hooks/useCanvaReturn';

import { CanvaTripPage } from './CanvaTripPage';

/** The state, the heading and the line for one way back. */
interface ReturnWords {
  state?: string;
  heading: string;
  line: string;
}

/**
 * Words for the way back.
 *
 * @returns the state above the heading (only while the check runs), the heading and the line
 */
function useReturnWords(state: CanvaReturnState): ReturnWords {
  const { t } = useTranslation('writing');
  if (state.kind === 'working') {
    return { heading: t('canva.working'), line: t('canva.workingLine') };
  }
  if (state.kind === 'cancelled') {
    return { heading: t('canva.cancelledHeading'), line: t('canva.cancelled') };
  }
  if (state.kind === 'failed') {
    return { heading: t('canva.stoppedHeading'), line: t(state.message.key, state.message.values) };
  }
  if (!state.isChecking) return { heading: t('canva.saved'), line: t('canva.savedVisible') };
  return {
    state: t('canva.waitingCheck'),
    heading: t('canva.saved'),
    line: t('canva.savedChecking'),
  };
}

/** The cover's place beside the header: a 2:3 box with a picture line (board D11). */
function CoverPlace() {
  return (
    // Decorative: the heading already says the cover is saved, so readers of the screen skip it.
    <span
      aria-hidden="true"
      className="flex aspect-[2/3] w-40 items-center justify-center rounded-cover border border-border bg-surface text-ink-muted"
    >
      <ActionIcon name="picture" size={32} />
    </span>
  );
}

/**
 * Renders the page.
 *
 * @returns the page
 */
export function CanvaReturnPage() {
  const state = useCanvaReturn();
  const words = useReturnWords(state);
  const backSlug = state.kind === 'working' ? null : state.slug;
  return (
    <CanvaTripPage
      heading={words.heading}
      line={words.line}
      state={words.state}
      backSlug={backSlug}
      isBackMain
      aside={state.kind === 'saved' ? <CoverPlace /> : undefined}
    />
  );
}
