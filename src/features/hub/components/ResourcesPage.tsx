/**
 * ResourcesPage: /resources, opened from the account menu (bundle G9 WRITING, part a; board
 * PhoneAppResources and TabletAppResources). Robert, 9 Nov 2026, 12:09 UTC: a separate page with
 * the writer's rights and how to use the platform, kept apart from the Writers' hub; 12:11 UTC:
 * step-by-step how-to guides about using the platform.
 *
 * Top to bottom: the heading, the "Writers' rights" card (linking to the full rights page, a CMS
 * help page written as questions and answers), the how-to guides, then "More help". The guides
 * and the rights page are CMS help pages (rule 4), so staff edit them in Staff › Website; the
 * page's own short lines are interface text. Anyone can open it, signed in or not.
 * Who shows it: the router, at /resources. What it calls: useWebsiteContent for the help pages,
 * lib/howToGuides.ts and ResourcesLinkList.
 */
import { Link } from 'react-router';

import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { brand } from '@/config/brand';
import { useWebsiteContent } from '@/features/website/hooks/useWebsiteContent';
import { withBrand } from '@/features/website/lib/brandText';
import { helpPageContentSchema } from '@/schemas/websiteContent';

import { howToGuides, writersRightsKey } from '../lib/howToGuides';
import { useHubTranslation } from '../registerHubTranslations';

import { ResourcesLinkList } from './ResourcesLinkList';

/** "More help": the four rows under the guides, in the board's order. */
const moreHelpLinks = [
  { href: '/help', key: 'help' },
  { href: '/legal/guidelines', key: 'guidelines' },
  { href: '/contact', key: 'contact' },
  { href: '/legal/privacy', key: 'legal' },
] as const;

/**
 * The "Writers' rights" card.
 *
 * @returns the card
 */
function RightsCard() {
  const { t } = useHubTranslation();
  return (
    <section
      aria-labelledby="resources-rights"
      className="flex flex-col gap-3 rounded-card border border-border bg-surface p-[clamp(20px,3vw,32px)] shadow-card"
    >
      <h2
        id="resources-rights"
        className="m-0 font-heading text-[24px] font-extrabold text-heading"
      >
        {t('resources.rights.heading')}
      </h2>
      <p className="m-0 max-w-[640px] leading-relaxed text-body">{t('resources.rights.body')}</p>
      <Link to={`/help/${writersRightsKey}`} className="self-start text-link underline">
        {t('resources.rights.link')}
      </Link>
    </section>
  );
}

/**
 * The how-to guides, as link rows.
 *
 * @returns the section
 */
function GuidesSection() {
  const { t } = useHubTranslation();
  const pages = useWebsiteContent('help_page', helpPageContentSchema);
  // Step 1: the guides from the CMS, each linking to its help page.
  const guides = howToGuides(pages.entries).map((guide) => ({
    href: `/help/${guide.entryKey}`,
    title: withBrand(guide.content.title),
    lang: guide.languageCode,
  }));
  return (
    <section aria-labelledby="resources-guides" className="flex flex-col gap-3">
      <h2
        id="resources-guides"
        className="m-0 font-heading text-[24px] font-extrabold text-heading"
      >
        {t('resources.guides.heading')}
      </h2>
      <p className="m-0 text-body">
        {t('resources.guides.intro', { productName: brand.productName })}
      </p>
      {/* Step 2: a plain message when the guides can't be read, or a line while there are none. */}
      {pages.readFailed && <Notice tone="error">{t('resources.guides.loadFailed')}</Notice>}
      {pages.isLoaded && guides.length === 0 && (
        <p className="m-0 text-body">{t('resources.guides.none')}</p>
      )}
      {guides.length > 0 && <ResourcesLinkList links={guides} />}
    </section>
  );
}

/**
 * Renders the page.
 *
 * @returns Resources
 */
export function ResourcesPage() {
  const { t } = useHubTranslation();
  const moreHelp = moreHelpLinks.map((link) => ({
    href: link.href,
    title: t(`resources.more.${link.key}Title`),
    line: t(`resources.more.${link.key}Line`, { productName: brand.productName }),
  }));
  return (
    <PageContainer className="flex max-w-[820px] flex-col gap-8 pt-10 pb-16">
      <title>{t('resources.documentTitle', { productName: brand.productName })}</title>
      <header className="flex flex-col gap-2">
        <h1 className="page-title">{t('resources.heading')}</h1>
        <p className="m-0 text-lg leading-relaxed text-body">{t('resources.intro')}</p>
      </header>
      <RightsCard />
      <GuidesSection />
      <section aria-labelledby="resources-more" className="flex flex-col gap-3">
        <h2
          id="resources-more"
          className="m-0 font-heading text-[24px] font-extrabold text-heading"
        >
          {t('resources.more.heading')}
        </h2>
        <ResourcesLinkList links={moreHelp} />
      </section>
    </PageContainer>
  );
}
