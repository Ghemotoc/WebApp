/**
 * LanguageSelect: the English / Română drop-down in the top bar and in the footer
 * (story S1-E1-04; decided 16 Oct 2026, late evening, Q11: a drop-down, not a toggle, in both).
 *
 * Board values (Discover): in the top bar the label "Language" is visually hidden; in the footer
 * it is shown beside the drop-down. Options in the board's order, each in its own language
 * (English, Română) with a lang attribute so screen readers pronounce them correctly. Height and
 * style follow the one Select (44 px everywhere, docs/board-fixes.md).
 * The top bar's drop-down shows only the code (EN, RO; handoff "Navigation": "Language shows only
 * the code", bundle G4 SHELL), and the footer's shows the full names. The options keep their lang
 * attribute either way.
 * Who uses it: AppLayout puts one in the top bar's and one in the footer's end slot.
 * What it calls: useInterfaceLanguage, which switches the screen and saves the choice.
 */
import { useTranslation } from 'react-i18next';

import { Select } from '@/components/ui/Select';
import { isSupportedLanguage, type SupportedLanguage } from '@/lib/i18n';

import { useInterfaceLanguage, type LanguageSaveStatus } from '../hooks/useInterfaceLanguage';

/** What the drop-down needs. */
export interface LanguageSelectProps {
  /** Unique on the page: the top bar and the footer each have one. */
  id: string;
  /** Shown in the footer; hidden (but read by screen readers) in the top bar, as on the board. */
  isLabelVisible?: boolean;
  /** Shows "EN" and "RO" instead of the names, for the website top bar (bundle G4 SHELL). */
  isCodeOnly?: boolean;
}

/** The languages in the board's order, each named in its own language. */
const languageOrder: readonly SupportedLanguage[] = ['en', 'ro'];

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
export function LanguageSelect({
  id,
  isLabelVisible = false,
  isCodeOnly = false,
}: LanguageSelectProps) {
  const { t } = useTranslation();
  const { language, changeLanguage, saveStatus } = useInterfaceLanguage();

  // The option names come from the locale files (language.en, language.ro); the top bar shows the
  // code in capitals instead.
  const options = languageOrder.map((code) => ({
    value: code,
    label: isCodeOnly ? code.toUpperCase() : t(`language.${code}`),
    lang: code,
  }));
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
