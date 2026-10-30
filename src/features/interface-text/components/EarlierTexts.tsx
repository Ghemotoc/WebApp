/**
 * EarlierTexts: what shows now, what is scheduled and the earlier texts of one key in one
 * language, each with Restore (story S1-E11-18 criterion 6). Restore brings the text back as the
 * draft; the app changes only when it is published again.
 * Who shows it: LocaleTextPanel.
 */
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { formatRomaniaDate } from '@/lib/romania-time';

import type { InterfaceTextEditorState } from '../hooks/useInterfaceTextEditor';
import type { LocaleVersions } from '../lib/textVersionState';

/** What the list needs. */
interface EarlierTextsProps {
  versions: LocaleVersions;
  locale: string;
  state: InterfaceTextEditorState;
}

/**
 * A date as the editor shows it.
 *
 * @returns the formatted date, or an empty text
 */
function dayOf(date: string | null, language: string): string {
  return date === null ? '' : formatRomaniaDate(new Date(`${date}T12:00:00Z`), language);
}

/**
 * Says what shows now.
 *
 * @returns the line
 */
function liveLine(
  versions: LocaleVersions,
  language: string,
  t: (key: string, values?: Record<string, string>) => string,
): string {
  if (versions.live === null || versions.live.isReset) return t('interfaceText.showsDefault');
  return t('history.since', { date: dayOf(versions.live.showFrom, language) });
}

/**
 * Renders the list.
 *
 * @returns the details block
 */
export function EarlierTexts({ versions, locale, state }: EarlierTextsProps) {
  const { t, i18n } = useTranslation('websiteAdmin');
  return (
    <details className="text-sm">
      <summary className="min-h-6 cursor-pointer font-semibold text-ink">
        {t('history.heading')}
      </summary>
      <dl className="m-0 flex flex-col">
        <div className="flex flex-wrap gap-x-3 border-b border-hairline py-2">
          <dt className="font-semibold text-ink">{t('history.live')}</dt>
          <dd className="m-0 text-body">{liveLine(versions, i18n.language, t)}</dd>
        </div>
        {versions.scheduled !== null && (
          <div className="flex flex-wrap gap-x-3 border-b border-hairline py-2">
            <dt className="font-semibold text-ink">{t('history.scheduled')}</dt>
            <dd className="m-0 text-body">
              {t('history.goesLive', { date: dayOf(versions.scheduled.showFrom, i18n.language) })}
            </dd>
          </div>
        )}
      </dl>
      <ul className="m-0 flex list-none flex-col p-0">
        {versions.earlier.map((version) => (
          <li
            key={version.id}
            className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline py-2"
          >
            <span lang={locale} className="min-w-0 flex-1 break-words text-body">
              {dayOf(version.showFrom, i18n.language)} · {version.text}
            </span>
            <Button
              variant="secondary"
              disabled={state.isActing}
              aria-label={t('history.restoreLabel', {
                date: dayOf(version.showFrom, i18n.language),
              })}
              onClick={() => void state.act({ kind: 'restore', versionId: version.id, locale })}
            >
              {t('history.restore')}
            </Button>
          </li>
        ))}
      </ul>
    </details>
  );
}
