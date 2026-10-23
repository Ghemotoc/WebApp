/**
 * OfflineBanner: "You're offline" while the network is down, then "You're back online" for a few
 * seconds (story S1-E1-05; board 7.4, States, card 2).
 *
 * Who uses it: AppLayout (src/app/shell/AppLayout.tsx), right under the top bar on every page.
 * What it calls: hooks/useOnlineStatus.ts.
 * Accessibility: the status region is always in the page, so screen readers announce the change
 * when the text appears (WCAG 2.2, 4.1.3 Status messages). It is text, never colour alone.
 * Board differences: the board's offline line promises that writing is saved on this device; that
 * comes with the chapter editor (S1-E3-02), so until then the banner only says what won't work.
 * "Back online" uses the success tone from the design tokens instead of the board's solid green,
 * so it also works in night mode (docs/board-fixes.md).
 */
import { useTranslation } from 'react-i18next';

import { useOnlineStatus } from '../hooks/useOnlineStatus';

/**
 * Renders the banner region, empty while online.
 *
 * @returns the status region with the offline or back-online text
 */
export function OfflineBanner() {
  const { t } = useTranslation();
  const { isOnline, isJustBackOnline } = useOnlineStatus();

  return (
    <div role="status">
      {!isOnline && (
        <p className="m-0 bg-primary px-5 py-3 text-center text-[15px] leading-normal font-medium text-on-primary">
          {t('offline.offline')}
        </p>
      )}
      {isOnline && isJustBackOnline && (
        <p className="m-0 border-y border-(--success-border) bg-(--success-bg) px-5 py-3 text-center text-[15px] leading-normal font-medium text-(--success-text)">
          {t('offline.backOnline')}
        </p>
      )}
    </div>
  );
}
