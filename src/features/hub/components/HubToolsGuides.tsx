/**
 * HubToolsGuides: the right of "Tools for the next chapter" on the Home page (board A01, Robert's
 * review of 25 Nov 2026): up to four quiet rows on the dark band, each a title over one line such
 * as "Guide · 6 min · Start late, end early, and give readers one question to carry.", and, when a
 * live session is coming up, a last row "Live: <title>" over "Workshop · Thursday 18:00 · <place>".
 *
 * Where the words come from, so staff change them without an engineer:
 * - the guides are the CMS's how-to help pages (admin site › Website › Help pages): the title,
 *   the reading time worked out from the body, and the page's search description (its "Search and
 *   share" fields) as the one-line summary, left out while it is empty;
 * - the live session is the next one staff listed (admin site › Writers' hub › Live sessions),
 *   shown only to members old enough for it (GAPS-12h; the server filters).
 * Who shows it: HubToolsSection. What it calls: useWebsiteContent (the help pages), howToGuides,
 * useHubSessions and sessionStartParts.
 */
import { Link } from 'react-router';

import { useWebsiteContent } from '@/features/website/hooks/useWebsiteContent';
import { withBrand } from '@/features/website/lib/brandText';
import { helpPageContentSchema } from '@/schemas/websiteContent';

import { useHubSessions } from '../hooks/useHubSessions';
import { guideReadingMinutes, howToGuides } from '../lib/howToGuides';
import { sessionStartParts } from '../lib/sessionTime';
import { useHubTranslation } from '../registerHubTranslations';

/** Four rows in all, as the board draws: three guides and a session, or four guides. */
const rowsShown = 4;

/** One row's words and where it leads. */
interface ToolRow {
  key: string;
  title: string;
  line: string;
  href: string;
  /** True for a session's join address, which opens outside the site. */
  isOutside: boolean;
  lang?: string;
}

/** A quiet tinted row on the dark band, its edge a little lighter than its fill. */
const rowClasses =
  'flex flex-col gap-1 rounded-card border border-on-primary/16 bg-on-primary/8 px-4 py-3 text-on-primary no-underline hover:underline';

/**
 * The guides as rows: title, then "Guide · N min · summary".
 *
 * @returns the rows, empty while the guides load or when there are none
 */
function useGuideRows(): { rows: ToolRow[]; isLoaded: boolean } {
  const { t } = useHubTranslation();
  const pages = useWebsiteContent('help_page', helpPageContentSchema);
  const guides = howToGuides(pages.entries);
  const rows = guides.map((guide) => {
    // Step 1: the kind and the reading time, then the summary staff wrote, when there is one.
    const parts = [
      t('hub.guides.kind'),
      t('hub.guides.minutesShort', { count: guideReadingMinutes(guide.content.body) }),
    ];
    const summary = guide.content.search?.description ?? '';
    if (summary !== '') parts.push(withBrand(summary));
    return {
      key: guide.entryKey,
      title: withBrand(guide.content.title),
      line: parts.join(' · '),
      href: `/help/${guide.entryKey}`,
      isOutside: false,
      lang: guide.languageCode,
    };
  });
  return { rows, isLoaded: pages.isLoaded || pages.readFailed };
}

/**
 * The next live session as a row, or null when none is coming up or it has no join address yet.
 *
 * @returns the row or null
 */
function useSessionRow(): ToolRow | null {
  const { t, i18n } = useHubTranslation();
  const { sessions } = useHubSessions();
  const next = sessions[0];
  if (next === undefined) return null;
  // Step 1: the words in the interface language, and the day and time on this device's clock.
  const isRomanian = i18n.language === 'ro';
  const title = isRomanian ? next.titleRo : next.titleEn;
  const place = isRomanian ? next.placeRo : next.placeEn;
  const start = sessionStartParts(next.startsAt, i18n.language);
  const parts = [t('hub.sessions.kind'), start.weekdayAndTime];
  if (place !== '') parts.push(place);
  return {
    key: next.id,
    title: t('hub.sessions.liveTitle', { title }),
    line: parts.join(' · '),
    // Without a join address the row opens the hub's list, where Remind me is.
    href: next.linkUrl ?? '/hub#hub-sessions',
    isOutside: next.linkUrl !== null,
  };
}

/**
 * Renders the rows.
 *
 * @returns the section, or nothing until the guides have loaded
 */
export function HubToolsGuides() {
  const { t } = useHubTranslation();
  const guides = useGuideRows();
  const session = useSessionRow();
  if (!guides.isLoaded) return null;
  // Step 1: the guides first, leaving the last place for the session when there is one.
  const guideCount = session === null ? rowsShown : rowsShown - 1;
  const rows = guides.rows.slice(0, guideCount);
  if (session !== null) rows.push(session);
  return (
    <section aria-labelledby="hub-guides" className="flex flex-col">
      {/* The section's name for screen readers; the visible heading is the tools section's. */}
      <h3 id="hub-guides" className="sr-only">
        {t('hub.guides.eyebrow')}
      </h3>
      {rows.length === 0 && <p className="m-0 text-on-primary">{t('hub.guides.none')}</p>}
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {rows.map((row) => (
          <li key={row.key} lang={row.lang}>
            <ToolRowLink row={row} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * One row as a link: inside the site through the router, a session's address in a new tab.
 *
 * @param props.row - the row
 * @returns the link
 */
function ToolRowLink({ row }: { row: ToolRow }) {
  const { t } = useHubTranslation();
  const content = (
    <>
      <span className="font-semibold">{row.title}</span>
      <span className="type-meta text-on-primary">{row.line}</span>
    </>
  );
  if (!row.isOutside) {
    return (
      <Link to={row.href} className={rowClasses}>
        {content}
      </Link>
    );
  }
  return (
    <a
      href={row.href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t('hub.sessions.openLabel', { title: row.title })}
      className={rowClasses}
    >
      {content}
    </a>
  );
}
