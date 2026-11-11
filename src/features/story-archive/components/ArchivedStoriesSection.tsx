/**
 * ArchivedStoriesSection: Settings › Archived stories (bundle ARCHIVE-1; Robert, 11 Nov 2026,
 * 19:47 to 19:52 UTC: the stories of an account that closed for not being used are kept 5 more
 * years so their writer can bring them back).
 *
 * It shows nothing unless stories wait for the logged-in account's confirmed email address, so
 * almost nobody ever sees it. It never says which stories or how many: that would tell whoever
 * holds the email address something before they prove the account was theirs.
 * Who shows it: SettingsGroupPanel, in the Download data group (/settings#archived-stories).
 * What it calls: hooks/useStoryArchive.ts and ArchivedStoriesForm.
 */
import { useTranslation } from 'react-i18next';

import { formatRomaniaDate } from '@/lib/romania-time';

import { useMyStoryArchive } from '../hooks/useStoryArchive';
import { useStoryArchiveTranslation } from '../registerStoryArchiveTranslations';

import { ArchivedStoriesForm } from './ArchivedStoriesForm';

/**
 * Renders the section, or nothing when no stories wait.
 *
 * @returns the Archived stories panel
 */
export function ArchivedStoriesSection() {
  const { t } = useStoryArchiveTranslation();
  const { i18n } = useTranslation();
  const archive = useMyStoryArchive();
  // Nothing waits, or the answer hasn't come (or failed): the panel stays out of the way.
  if (archive.data === undefined || !archive.data.waiting) return null;
  const keptUntil = formatRomaniaDate(new Date(archive.data.keptUntil), i18n.language);
  return (
    <section
      id="archived-stories"
      aria-labelledby="archived-stories-heading"
      className="flex flex-col gap-3 rounded-card border border-border bg-surface p-[clamp(20px,5vw,32px)] shadow-card"
    >
      <h2
        id="archived-stories-heading"
        className="m-0 font-heading text-[24px] font-bold text-heading"
      >
        {t('heading')}
      </h2>
      <p className="m-0 text-body">{t('intro', { date: keptUntil })}</p>
      <p className="m-0 text-[13px] text-meta">{t('pictures')}</p>
      <ArchivedStoriesForm lockedAtStart={archive.data.locked} />
    </section>
  );
}
