/**
 * FirstStoryGuides: "Guides for a first story" on an empty Write page (board D04, user story 5.4).
 *
 * Plain rows under a 24/30 heading, a hairline between them: the guide's title as a link to its
 * help page, a meta line with its kind and minutes ("Guide · 6 min"), then one line in the muted
 * ink. The rows are CMS help pages (lib/firstStoryGuides.ts), so staff change them from Staff ›
 * Website › Help. While the pages load nothing shows; with no guide at all the section is left
 * out, so an empty heading never sits on the page.
 * Who shows it: WriteEmptyState. What it calls: useWebsiteContent (the help pages),
 * lib/firstStoryGuides.ts, withBrand and MetaLine.
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { MetaLine } from '@/components/ui/MetaLine';
import { useWebsiteContent } from '@/features/website/hooks/useWebsiteContent';
import { withBrand } from '@/features/website/lib/brandText';
import { helpPageContentSchema } from '@/schemas/websiteContent';

import { firstStoryGuides, type FirstStoryGuide } from '../lib/firstStoryGuides';

/** One guide: the title link, its kind and minutes, then its line. */
function GuideRow({ guide }: { guide: FirstStoryGuide }) {
  const { t, i18n } = useTranslation('writing');
  // A page shown in another language (the English fallback) says so to screen readers.
  const lang = guide.languageCode === i18n.language ? undefined : guide.languageCode;
  return (
    <li lang={lang} className="flex flex-col gap-1 border-t border-hairline py-3">
      <Link
        to={guide.href}
        className="w-fit type-label font-semibold text-ink-heading no-underline hover:underline"
      >
        {withBrand(guide.title)}
      </Link>
      <MetaLine
        facts={[
          { text: guide.kind },
          { text: t('writeEmpty.guides.minutes', { count: guide.minutes }) },
        ]}
      />
      {guide.line !== '' && <p className="m-0 type-body text-ink-muted">{withBrand(guide.line)}</p>}
    </li>
  );
}

/**
 * Renders the guides.
 *
 * @returns the section, or nothing while the pages load or when there is no guide
 */
export function FirstStoryGuides() {
  const { t } = useTranslation('writing');
  const pages = useWebsiteContent('help_page', helpPageContentSchema);
  if (!pages.isLoaded) return null;
  const guides = firstStoryGuides(pages.entries);
  if (guides.length === 0) return null;
  return (
    <section aria-labelledby="write-empty-guides" className="flex flex-col gap-4">
      <h2 id="write-empty-guides" className="m-0 type-heading text-ink-heading">
        {t('writeEmpty.guides.heading')}
      </h2>
      <ul className="m-0 list-none p-0">
        {guides.map((guide) => (
          <GuideRow key={guide.key} guide={guide} />
        ))}
      </ul>
    </section>
  );
}
