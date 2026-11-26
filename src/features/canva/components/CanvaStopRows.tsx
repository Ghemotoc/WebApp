/**
 * CanvaStopRows: "If something stops it" on the Canva start page, as board D10 draws it (BOOKS
 * D10, user story 5.10): a heading and two rows under fine lines, each a short title, a muted
 * line on what to do and, for the first, "Try again".
 *
 * - Canva didn't answer: nothing was changed, and "Try again" asks once more (it reloads this
 *   tab, which starts the trip again).
 * - Pop-ups are blocked: the browser stopped this tab opening; allow pop-ups for the site, then
 *   press "Design it in Canva" again.
 * Who shows it: CanvaStartPage. What it calls: nothing; the site's address comes from the brand
 * config (CLAUDE.md: names and domains are settings, not code).
 */
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { brand } from '@/config/brand';

/** One row: a title, the line under it and, when there is one, its button. */
function StopRow(props: { title: string; line: string; action?: ReactNode }) {
  return (
    <li className="flex flex-wrap items-center gap-4 border-b border-border py-4 last:border-b-0">
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="type-label font-semibold text-ink">{props.title}</span>
        <span className="type-body text-ink-muted">{props.line}</span>
      </span>
      {props.action}
    </li>
  );
}

/**
 * Renders the section.
 *
 * @returns the heading and the two rows
 */
export function CanvaStopRows() {
  const { t } = useTranslation('writing');
  return (
    <section aria-labelledby="canva-stop-heading" className="flex flex-col gap-4">
      <h2
        id="canva-stop-heading"
        className="m-0 font-heading type-heading font-bold text-ink-heading"
      >
        {t('canva.stops.heading')}
      </h2>
      <ul className="m-0 flex list-none flex-col border-t border-border p-0">
        <StopRow
          title={t('canva.stops.noAnswer')}
          line={t('canva.stops.noAnswerLine')}
          action={
            <Button variant="secondary" size="md" onClick={() => window.location.reload()}>
              {t('canva.stops.tryAgain')}
            </Button>
          }
        />
        <StopRow
          title={t('canva.stops.popUps')}
          line={t('canva.stops.popUpsLine', { site: brand.siteDomain })}
        />
      </ul>
    </section>
  );
}
