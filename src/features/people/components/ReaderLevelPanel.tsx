/**
 * ReaderLevelPanel: the "Reading level" card in a profile's side column, under the writing rank
 * card (bundle G7a; the Profile board's Reading level card).
 *
 * Board values: the eyebrow, the level as the heading ("No reading level yet" before the first
 * chapter read), one line on how levels work, the four-level ladder and the progress bar. Others
 * see the card only when its owner shows the level; the owner always sees it, with a line saying
 * only they can see it while it is hidden and a link to Settings › Privacy.
 * Who uses it: WriterProfilePage. What it calls: useProfileReaderLevel → profile_reader_level(),
 * ReaderLevelLadder and ReaderLevelProgressBar.
 */
import { Link } from 'react-router';

import { Card } from '@/components/ui/Card';
import { Eyebrow } from '@/components/ui/Eyebrow';

import { showsReaderLevelPanel } from '../api/readerLevel';
import { useProfileReaderLevel } from '../hooks/useReaderLevel';
import { usePeopleTranslation } from '../registerPeopleTranslations';

import { ReaderLevelLadder } from './ReaderLevelLadder';
import { ReaderLevelProgressBar } from './ReaderLevelProgressBar';

/** What the card needs. */
export interface ReaderLevelPanelProps {
  handle: string;
  /** The profile's display name, for the top-level line. */
  name: string;
}

/** "Only you can see this", with the way to Settings › Privacy, for the owner of a hidden level. */
function HiddenNote() {
  const { t } = usePeopleTranslation();
  return (
    <p className="m-0 text-[13px] text-meta">
      {t('readerLevel.hiddenNote')}{' '}
      <Link to="/settings#privacy" className="font-semibold text-link underline">
        {t('readerLevel.hiddenLink')}
      </Link>
    </p>
  );
}

/**
 * Renders the card.
 *
 * @returns the card, or nothing when there is no level to show this viewer
 */
export function ReaderLevelPanel({ handle, name }: ReaderLevelPanelProps) {
  const { t } = usePeopleTranslation();
  const reading = useProfileReaderLevel(handle).data ?? null;
  if (reading === null || !showsReaderLevelPanel(reading)) return null;
  const heading =
    reading.level === null ? t('readerLevel.noLevelYet') : t(`readerLevel.names.${reading.level}`);
  return (
    <Card>
      <section aria-labelledby="profile-reader-level-heading" className="flex flex-col gap-3.5">
        <div className="self-start">
          <Eyebrow>{t('readerLevel.eyebrow')}</Eyebrow>
        </div>
        <h2
          id="profile-reader-level-heading"
          className="m-0 font-heading text-[26px] font-bold text-heading"
        >
          {heading}
        </h2>
        <p className="m-0 text-[15px] leading-[1.6] text-body">{t('readerLevel.explainer')}</p>
        <ReaderLevelLadder current={reading.level} />
        <ReaderLevelProgressBar reading={reading} name={name} />
        {reading.isOwn && !reading.isShown && <HiddenNote />}
      </section>
    </Card>
  );
}
