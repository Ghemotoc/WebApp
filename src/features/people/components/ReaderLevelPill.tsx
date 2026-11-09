/**
 * ReaderLevelPill: a person's reading level as a plain glass text pill, "Bookworm", beside their
 * writing rank above the pen name (bundle G7a; the Profile board's second `tag`).
 *
 * Shown only when there is a level and its owner shows it on their profile; the owner sees their
 * own hidden level in the Reading level card instead, so the header looks the way others see it.
 * Who uses it: ProfileHeader. What it calls: useProfileReaderLevel → profile_reader_level().
 */
import { GlassTag } from '@/components/ui/GlassTag';

import { useProfileReaderLevel } from '../hooks/useReaderLevel';
import { usePeopleTranslation } from '../registerPeopleTranslations';

/** The board's open book, 14 px, in the text colour. */
function BookIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z" />
      <path d="M5 17a3 3 0 0 1 3-3h10" />
    </svg>
  );
}

/**
 * Renders the pill.
 *
 * @param props.handle - the profile's username
 * @returns the pill, or nothing when there is no level to show
 */
export function ReaderLevelPill({ handle }: { handle: string }) {
  const { t } = usePeopleTranslation();
  const reading = useProfileReaderLevel(handle).data ?? null;
  if (reading === null || reading.level === null || !reading.isShown) return null;
  return (
    <GlassTag
      icon={<BookIcon />}
      title={t('readerLevel.pillTitle')}
      hiddenPrefix={t('readerLevel.prefix')}
      testId="reader-level-pill"
    >
      {t(`readerLevel.names.${reading.level}`)}
    </GlassTag>
  );
}
