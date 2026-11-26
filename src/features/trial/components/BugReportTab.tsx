/**
 * BugReportTab: the "Report a bug" tab on the right edge of the window, halfway down, and the
 * panel it opens (TRIAL-FEEDBACK; board J30: a tab with its words running up the edge; on phones
 * a little lower, clear of the tab bar). Since 26 Nov 2026 it is quiet (Robert, DESIGN thread:
 * "slightly smaller ... thinner in the background colour", Inter, a bug icon): the page colour
 * with a thin main-colour edge, 11 px words and a 12 px bug icon below them, through the
 * `bug-tab` class in src/styles/index.css.
 *
 * Who uses it: TrialFeedback, which loads this file only for a signed-in member while the
 * trial_feedback flag is on.
 * What it calls: BugReportPanel, fetched the first time the tab is pressed.
 * When the panel closes, focus goes back to the tab (Sheet's native dialog does that).
 */
import { lazy, Suspense, useState } from 'react';

import { ActionIcon } from '@/components/icons/ActionIcon';

import { useTrialTranslation } from '../registerTrialTranslations';

/** The panel, in its own file: most visits never open it. */
const BugReportPanel = lazy(async () => {
  const module = await import('./BugReportPanel');
  return { default: module.BugReportPanel };
});

/**
 * The tab, and the panel once it has been opened.
 *
 * @returns the tab button and, after the first press, the panel
 */
export function BugReportTab() {
  const { t } = useTrialTranslation();
  const [isOpen, setIsOpen] = useState(false);
  // The panel stays in the page after its first opening, so a closed report keeps its words.
  const [hasOpened, setHasOpened] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setHasOpened(true);
          setIsOpen(true);
        }}
        aria-haspopup="dialog"
        data-bug-report-tab
        className="bug-tab top-[52%] right-0 z-30 flex rotate-180 items-center justify-center gap-2 px-3 py-1 [writing-mode:vertical-rl] min-[600px]:top-[46%]"
      >
        {/* The tab is turned half a circle so the words read upwards; the bug comes first so it
            ends up below them, turned back so it stands upright. The button keeps its words. In
            vertical writing px- runs along the tab (12 px) and py- across it (4 px). */}
        <ActionIcon name="bug" size={12} className="rotate-180" />
        {t('bugReport.tab')}
      </button>
      {hasOpened && (
        <Suspense fallback={null}>
          <BugReportPanel isOpen={isOpen} onClose={() => setIsOpen(false)} />
        </Suspense>
      )}
    </>
  );
}
