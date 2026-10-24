/**
 * DoodleSection: the doodles on /design, so anyone can see them follow light and night mode
 * (Lane B, "Design: doodles take their colours from the tokens", 23 Oct 2026).
 *
 * Two parts: three sample doodles side by side in a light panel and a night panel (each panel
 * carries data-theme, so its tokens take that theme's values whatever the page uses, as
 * ColourPanel does), then a button that loads every doodle in the page's own theme, for the
 * sign-off sheet (DoodleSheet).
 * Who uses it: DesignPage. The e2e test e2e/doodles.spec.ts reads the drawn colours back here.
 */
import { useTranslation } from 'react-i18next';

import { sampleDoodles } from '../doodleFiles';
import { DesignSection } from './DesignSection';
import { DoodleSheet } from './DoodleSheet';
import { DoodleTile } from './DoodleTile';

/** The two themes the sample panels show. */
const themes = ['light', 'night'] as const;

/**
 * Renders the section.
 *
 * @returns the section
 */
export function DoodleSection() {
  const { t } = useTranslation('design');

  return (
    <DesignSection id="doodles" title={t('sections.doodles')}>
      <p className="m-0 max-w-[720px] text-body">{t('doodles.intro')}</p>
      <div className="grid gap-4 md:grid-cols-2">
        {themes.map((theme) => (
          <div
            key={theme}
            data-theme={theme}
            data-testid={`doodle-samples-${theme}`}
            className="rounded-card border border-border bg-paper p-5 text-ink"
          >
            <h3 className="m-0 mb-4 text-xl font-bold">{t(`colours.${theme}`)}</h3>
            <ul className="m-0 flex list-none flex-wrap gap-4 p-0">
              {sampleDoodles.map((doodle) => (
                <DoodleTile key={doodle.id} doodle={doodle} size={96} />
              ))}
            </ul>
          </div>
        ))}
      </div>
      <DoodleSheet />
    </DesignSection>
  );
}
