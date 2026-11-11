/**
 * LanguageSelect: the English / Română drop-down in the footer (story S1-E1-04; Q11, 16 Oct 2026:
 * a drop-down, not a toggle). Robert, 9 Nov 2026, 12:20 UTC (bundle FIX-3): the language menu
 * sits only in the footer and in Settings, never in the top bar, so the top bar's code-only
 * version (EN, RO; bundle G4 SHELL) is gone. Settings has its own panel, LanguageSettingsSection.
 *
 * Board values (Discover): the label "Language" is shown beside the drop-down, or visually hidden
 * where a frame asks for it. Options in the board's order, each in its own language (English,
 * Română, and Svenska, Dansk or Norsk bokmål once staff open them; MARKETS-2a) with a lang
 * attribute so screen readers pronounce them correctly. Height and style
 * follow the one Select (44 px everywhere, docs/board-fixes.md).
 * Who uses it: AppLayout's footer, and the staff frame (StaffLayout, StaffFooter).
 * What it calls: useInterfaceLanguage, which switches the screen and saves the choice.
 */
import { useTranslation } from 'react-i18next';

import { Select } from '@/components/ui/Select';
import { isSupportedLanguage } from '@/lib/i18n';

import { useInterfaceLanguage, type LanguageSaveStatus } from '../hooks/useInterfaceLanguage';
import { useLanguageOptions } from '../hooks/useLanguageOptions';

/** What the drop-down needs. */
export interface LanguageSelectProps {
  /** Unique on the page: the public footer and the staff footer each pass their own. */
  id: string;
  /** Shown in the footer; hidden (but read by screen readers) where a frame has no room. */
  isLabelVisible?: boolean;
}

/** The message key for each save result; nothing is said before a choice is made. */
const saveMessageKeys: Record<LanguageSaveStatus, string | null> = {
  idle: null,
  savedToAccount: 'language.savedToAccount',
  keptOnDevice: 'language.keptOnDevice',
};

/**
 * Renders the labelled drop-down and the message about where the choice was saved.
 *
 * @returns the drop-down
 */
export function LanguageSelect({ id, isLabelVisible = false }: LanguageSelectProps) {
  const { t } = useTranslation();
  const { language, changeLanguage, saveStatus } = useInterfaceLanguage();

  // The open languages only, in the board's order (English, Română, then any Nordic language
  // staff have opened; MARKETS-2a), each named in its own language.
  const options = useLanguageOptions();
  const messageKey = saveMessageKeys[saveStatus];

  return (
    <span className="inline-flex flex-col gap-1">
      <Select
        id={id}
        label={t('language.label')}
        isLabelVisible={isLabelVisible}
        placement="bar"
        options={options}
        value={language}
        onChange={(value) => {
          // The drop-down only offers valid values; the check keeps TypeScript and any surprise safe.
          if (isSupportedLanguage(value)) void changeLanguage(value);
        }}
      />
      {/* Always in the page, so screen readers announce the message when it appears. A success
          is announced only; a failure is also shown, because the person may want to try again. */}
      <span
        role="status"
        className={saveStatus === 'keptOnDevice' ? 'max-w-60 text-[13px] text-body' : 'sr-only'}
      >
        {messageKey === null ? '' : t(messageKey)}
      </span>
    </span>
  );
}
