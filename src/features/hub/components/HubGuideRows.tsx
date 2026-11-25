/**
 * HubGuideRows: "Writing guides" on the Writers' hub (user story 1.3, board A03-WritersHub).
 *
 * The first four how-to guides from the Help centre as plain rows: the guide's title, then
 * "Guide · 6 min read" (the minutes worked out from the guide's length). "Guides" at the right
 * opens every guide (/resources).
 * Who shows it: WritersHubPage. What it calls: useWebsiteContent (the help pages), howToGuides
 * and HubRows.
 */
import { Link } from 'react-router';

import { buttonClassName } from '@/components/ui/buttonStyles';
import { useWebsiteContent } from '@/features/website/hooks/useWebsiteContent';
import { withBrand } from '@/features/website/lib/brandText';
import { helpPageContentSchema } from '@/schemas/websiteContent';

import { guideReadingMinutes, howToGuides } from '../lib/howToGuides';
import { useHubTranslation } from '../registerHubTranslations';

import { HubRows, type HubRow } from './HubRows';

/** How many guides the hub lists (four on the board). */
const guidesShown = 4;

/**
 * Renders the guides.
 *
 * @returns the section, or nothing while the guides load
 */
export function HubGuideRows() {
  const { t } = useHubTranslation();
  const pages = useWebsiteContent('help_page', helpPageContentSchema);
  if (!pages.isLoaded && !pages.readFailed) return null;
  const guides = howToGuides(pages.entries).slice(0, guidesShown);
  const rows: HubRow[] = guides.map((guide) => ({
    key: guide.entryKey,
    title: withBrand(guide.content.title),
    href: `/help/${guide.entryKey}`,
    lang: guide.languageCode,
    facts: [
      { text: t('hub.guides.kind') },
      { text: t('hub.guides.minutes', { count: guideReadingMinutes(guide.content.body) }) },
    ],
  }));
  return (
    <HubRows
      headingId="hub-guides"
      heading={t('hub.guides.heading')}
      headerAction={
        <Link to="/resources" className={buttonClassName({ variant: 'text' })}>
          {t('hub.tools.guidesLink')}
        </Link>
      }
      rows={rows}
      footer={
        guides.length === 0 ? <p className="m-0 text-ink-muted">{t('hub.guides.none')}</p> : null
      }
    />
  );
}
