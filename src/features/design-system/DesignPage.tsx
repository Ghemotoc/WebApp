/**
 * DesignPage: every colour, font and component on one page, to compare with the boards
 * (story S1-E1-03).
 *
 * Who shows it: the router, at /design, only in development and on staging builds with
 * VITE_SHOW_DESIGN_PAGE=true (decided 17 Oct 2026); it is loaded lazily, so production never
 * carries it. Search engines are asked not to index it.
 * What it calls: each section component in ./components, which use the components in
 * src/components/ui. Its text is in src/locales/<language>/design.json.
 */
import { useTranslation } from 'react-i18next';

import { Eyebrow } from '@/components/ui/Eyebrow';
import { PageContainer } from '@/components/ui/PageContainer';

import { AdSection } from './components/AdSection';
import { ButtonSection } from './components/ButtonSection';
import { CardSection } from './components/CardSection';
import { ColourSection } from './components/ColourSection';
import { DoodleSection } from './components/DoodleSection';
import { FormSection } from './components/FormSection';
import { NoticeSection } from './components/NoticeSection';
import { PillSection } from './components/PillSection';
import { ShelfSection } from './components/ShelfSection';
import { ShellSection } from './components/ShellSection';
import { TypeSection } from './components/TypeSection';
import { registerDesignTranslations } from './registerDesignTranslations';

/**
 * Renders the design system page.
 *
 * @returns the page
 */
export function DesignPage() {
  const { i18n } = useTranslation();
  // Make the page's own text available before anything below asks for it.
  registerDesignTranslations(i18n);
  const { t } = useTranslation('design');

  return (
    <PageContainer className="pt-12 pb-7">
      <title>{t('page.documentTitle')}</title>
      <meta name="robots" content="noindex" />
      <header className="tmc-rise flex flex-col gap-4">
        <Eyebrow>{t('page.eyebrow')}</Eyebrow>
        <h1 className="m-0 text-[clamp(36px,4.4vw,64px)] leading-[0.98] font-extrabold tracking-[-0.025em]">
          {t('page.title')}
        </h1>
        <p className="m-0 max-w-[720px] text-lg leading-[1.6] text-body">{t('page.intro')}</p>
      </header>
      <ColourSection />
      <TypeSection />
      <ButtonSection />
      <FormSection />
      <PillSection />
      <CardSection />
      <ShelfSection />
      <NoticeSection />
      <AdSection />
      <ShellSection />
      {/* Lane B (23 Oct 2026): the doodles in light and night, drawn from the tokens. */}
      <DoodleSection />
    </PageContainer>
  );
}
