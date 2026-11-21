/**
 * BugReportTab: the "Report a bug" tab on the right edge of the window, halfway down, and the
 * panel it opens (TRIAL-FEEDBACK; board J30: a main-coloured tab with its words running up the
 * edge; on phones a little lower, clear of the tab bar).
 *
 * Who uses it: TrialFeedback, which loads this file only for a signed-in member while the
 * trial_feedback flag is on.
 * What it calls: BugReportPanel, fetched the first time the tab is pressed.
 * When the panel closes, focus goes back to the tab (Sheet's native dialog does that).
 */
import { lazy, Suspense, useState } from 'react';

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
        className="button-main fixed top-[52%] right-0 z-30 flex min-w-11 rotate-180 items-center justify-center rounded-r-[12px] px-3 py-3.5 font-body text-[15px] leading-none font-semibold [writing-mode:vertical-rl] min-[600px]:top-[46%]"
      >
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
