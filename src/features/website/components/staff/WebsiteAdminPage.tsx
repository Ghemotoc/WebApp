/**
 * WebsiteAdminPage: Staff › Website, where the owner and admins edit the website's home page,
 * notice banners, help pages and questions (stories S1-E11-06, S1-E11-10 and S1-E11-12;
 * architecture 1.8.6; boards AdminSettings and AdminPages).
 *
 * Tabs (links, so each has its own address): Home page (/staff/website), Notice banners
 * (/staff/website/notices), Help and questions (/staff/website/help), Interface text
 * (/staff/website/interface-text, S1-E11-18), Email templates (/staff/website/emails,
 * S1-E11-19) and Landing pages
 * (/staff/website/landing-pages, S1-E11-14) and Branding (/staff/website/branding, BRAND-1a: the
 * logo and emblem for each theme) and Seasonal looks (/staff/website/seasonal, G12a: the days
 * each seasonal look shows). The website tabs start with the market and language picker. Plain
 * components (staff screens). The seasonal doodle schedule (S1-E11-11) was retired in bundle
 * NO-DOODLES (Robert, 9 Nov 2026); Seasonal looks replaces it. Staff without
 * the website area see why; the database refuses their changes anyway (decided 17 Oct 2026, 19:19).
 * Who shows it: the router, inside StaffLayout. What it calls: the editor for each tab.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';

import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { useMyStaffAccess } from '@/features/staff/hooks/useMyStaffAccess';
import { cn } from '@/lib/utils';

import { BrandingTab } from '@/features/branding/components/staff/BrandingTab';
import { LandingPagesTab } from '@/features/landing-pages/components/staff/LandingPagesTab';
import { InterfaceTextTab } from '@/features/interface-text/components/InterfaceTextTab';

import { registerWebsiteAdminTranslations } from '../../registerWebsiteAdminTranslations';

import { HelpEditor } from './HelpEditor';
import { HomePageEditor } from './HomePageEditor';
import { MarketLanguagePicker } from './MarketLanguagePicker';
import { NoticeEditor } from './NoticeEditor';
import { SeasonalLooksTab } from './SeasonalLooksTab';

/** The tabs: their address part and label key. */
const tabs = [
  { area: undefined, href: '/staff/website', labelKey: 'tabs.home' },
  { area: 'notices', href: '/staff/website/notices', labelKey: 'tabs.notices' },
  { area: 'help', href: '/staff/website/help', labelKey: 'tabs.help' },
  // S1-E11-18 and S1-E11-19: the app's own text, one version per language, not per market.
  { area: 'interface-text', href: '/staff/website/interface-text', labelKey: 'tabs.interfaceText' },
  { area: 'emails', href: '/staff/website/emails', labelKey: 'tabs.emails' },
  // S1-E11-14: landing pages for contests and campaigns, written in both languages side by side.
  { area: 'landing-pages', href: '/staff/website/landing-pages', labelKey: 'tabs.landingPages' },
  // BRAND-1a: the logo and emblem for the light and night themes; the emblem is the tab icon.
  { area: 'branding', href: '/staff/website/branding', labelKey: 'tabs.branding' },
  // G12a: which days each seasonal look shows, for members who turned seasonal looks on.
  { area: 'seasonal', href: '/staff/website/seasonal', labelKey: 'tabs.seasonal' },
] as const;

/** The email templates are the keys of the email namespace (S1-E11-19). */
const emailNamespaces = ['email'];

/**
 * The tab links.
 *
 * @returns the navigation
 */
function WebsiteTabs({ current }: { current: string | undefined }) {
  const { t } = useTranslation('websiteAdmin');
  return (
    <nav aria-label={t('tabs.label')}>
      <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
        {tabs.map((tab) => (
          <li key={tab.href}>
            <Link
              to={tab.href}
              aria-current={tab.area === current ? 'page' : undefined}
              className={cn(
                'inline-flex h-11 items-center rounded-full border border-control-border px-5 text-sm font-semibold no-underline',
                tab.area === current ? 'bg-primary text-on-primary' : 'bg-surface text-heading',
              )}
            >
              {t(tab.labelKey)}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * The editor for the open tab.
 *
 * @returns the editing area
 */
function WebsiteEditors({ area }: { area: string | undefined }) {
  const { t } = useTranslation('websiteAdmin');
  // The app's own text has no market: one version per language (decided 17 Oct 2026, 19:19).
  if (area === 'interface-text') return <InterfaceTextTab />;
  // Landing pages carry both languages in one version and have no market (S1-E11-14).
  if (area === 'landing-pages') return <LandingPagesTab />;
  // The logo and emblem are the same in every market and language (BRAND-1a).
  if (area === 'branding') return <BrandingTab />;
  // The seasonal looks show on the same days in every market (bundle G12a).
  if (area === 'seasonal') return <SeasonalLooksTab />;
  if (area === 'emails') {
    return (
      <div className="flex flex-col gap-4">
        <p className="m-0 max-w-[760px] text-body">{t('emails.intro')}</p>
        <InterfaceTextTab namespaces={emailNamespaces} />
      </div>
    );
  }
  return <MarketEditors area={area} />;
}

/**
 * The market and language picker and the editor for a website tab.
 *
 * @returns the editing area
 */
function MarketEditors({ area }: { area: string | undefined }) {
  const [place, setPlace] = useState({
    marketCode: 'RO',
    language: 'ro',
    marketLanguages: ['ro', 'en'],
  });
  return (
    <div className="flex flex-col gap-6">
      <MarketLanguagePicker
        marketCode={place.marketCode}
        language={place.language}
        isLanguageShown={area !== 'notices'}
        onChange={(marketCode, language, marketLanguages) =>
          setPlace({ marketCode, language, marketLanguages })
        }
      />
      {area === undefined && (
        <HomePageEditor marketCode={place.marketCode} language={place.language} />
      )}
      {area === 'notices' && (
        <NoticeEditor marketCode={place.marketCode} marketLanguages={place.marketLanguages} />
      )}
      {area === 'help' && <HelpEditor marketCode={place.marketCode} language={place.language} />}
    </div>
  );
}

/**
 * Renders the page.
 *
 * @returns the Website screen
 */
export function WebsiteAdminPage() {
  const { i18n } = useTranslation();
  registerWebsiteAdminTranslations(i18n);
  const { t } = useTranslation('websiteAdmin');
  const { area } = useParams();
  const { access, isKnown } = useMyStaffAccess();
  const mayEdit = access.areas.some(
    (allowed) => allowed.area === 'website_cms' && allowed.access === 'act',
  );
  return (
    <PageContainer className="flex flex-col gap-6 pt-12 pb-10">
      <title>{t('documentTitle')}</title>
      <div className="flex max-w-[760px] flex-col gap-2">
        <Eyebrow>{t('eyebrow')}</Eyebrow>
        <h1 className="m-0 font-heading text-[34px] font-bold text-heading">{t('heading')}</h1>
        <p className="m-0 text-body">{t('intro')}</p>
        <Link
          to="/staff/audit-log?action=website."
          className="inline-flex min-h-6 items-center text-sm text-link underline"
        >
          {t('auditLink')}
        </Link>
      </div>
      <WebsiteTabs current={area} />
      {isKnown && !mayEdit && <Notice tone="error">{t('failures.not_allowed')}</Notice>}
      {isKnown && mayEdit && <WebsiteEditors area={area} />}
    </PageContainer>
  );
}
