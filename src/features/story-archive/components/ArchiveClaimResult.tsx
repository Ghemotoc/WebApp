/**
 * ArchiveClaimResult: the line that says what "Bring stories back" did (bundle ARCHIVE-1).
 *
 * Who shows it: ArchivedStoriesForm, under the fields. What it calls: nothing.
 * It is announced to screen readers (Notice has a live region role).
 */
import { Link } from 'react-router';

import { Notice } from '@/components/ui/Notice';

import type { ArchiveClaimOutcome } from '../api/storyArchive';
import { useStoryArchiveTranslation } from '../registerStoryArchiveTranslations';

/** What the line needs. */
export interface ArchiveClaimResultProps {
  outcome: ArchiveClaimOutcome;
}

/**
 * The stories that came back, and any that couldn't.
 *
 * @returns one or two notices and a link to the writer's stories
 */
function RestoredResult({ restored, notRestored }: { restored: number; notRestored: number }) {
  const { t } = useStoryArchiveTranslation();
  return (
    <>
      <Notice tone="success">
        {t('restored', { count: restored })}{' '}
        <Link to="/write" className="text-link underline">
          {t('openStories')}
        </Link>
      </Notice>
      {notRestored > 0 && (
        <Notice tone="warning">{t('notRestored', { count: notRestored })}</Notice>
      )}
    </>
  );
}

/**
 * Renders the result of the last try.
 *
 * @returns the notice for that outcome
 */
export function ArchiveClaimResult({ outcome }: ArchiveClaimResultProps) {
  const { t } = useStoryArchiveTranslation();
  switch (outcome.outcome) {
    case 'restored':
      return <RestoredResult restored={outcome.restored} notRestored={outcome.notRestored} />;
    case 'not_restored':
      return <Notice tone="warning">{t('notRestored', { count: outcome.notRestored })}</Notice>;
    case 'no_match':
      // The last wrong try also locks the form, so it says so instead of "0 tries left".
      return (
        <Notice tone="error">
          {outcome.triesLeft > 0 ? t('noMatch', { count: outcome.triesLeft }) : t('noMatchLast')}
        </Notice>
      );
    case 'locked':
      return <Notice tone="error">{t('locked')}</Notice>;
    case 'not_allowed':
      return <Notice tone="warning">{t('notAllowed')}</Notice>;
    default:
      return <Notice tone="warning">{t('unavailable')}</Notice>;
  }
}
