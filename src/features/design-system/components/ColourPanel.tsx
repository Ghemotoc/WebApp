/**
 * ColourPanel: every token pair in one theme, with its live contrast ratio (story S1-E1-03).
 *
 * How: the panel carries data-theme="light" or "night", so the tokens inside it take that theme's
 * values whatever the page uses (src/styles/tokens.css). After it draws, it reads the actual
 * colours back from the browser and works out each ratio with src/lib/contrast.ts. The list of
 * pairs is the same one the CI contrast test checks (src/styles/contrast-pairs.ts).
 * Who uses it: ColourSection.
 */
import { useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { contrastRatio } from '@/lib/contrast';
import { contrastPairs } from '@/styles/contrast-pairs';

/**
 * Reads each pair's colours from the panel and works out the ratios.
 *
 * @param panel - the element carrying data-theme
 * @returns the ratio for each pair, by "foreground/background"
 */
function measureRatios(panel: HTMLElement): Record<string, number> {
  const styles = getComputedStyle(panel);
  const ratios: Record<string, number> = {};
  for (const pair of contrastPairs) {
    const foreground = styles.getPropertyValue(`--${pair.foreground}`).trim();
    const background = styles.getPropertyValue(`--${pair.background}`).trim();
    ratios[`${pair.foreground}/${pair.background}`] = contrastRatio(foreground, background);
  }
  return ratios;
}

/**
 * Renders the panel for one theme.
 *
 * @param props.theme - which token set to show
 * @returns the panel
 */
export function ColourPanel({ theme }: { theme: 'light' | 'night' }) {
  const { t } = useTranslation('design');
  const panelRef = useRef<HTMLDivElement>(null);
  const [ratios, setRatios] = useState<Record<string, number>>({});

  // Measure once the browser has applied the theme's colours.
  useLayoutEffect(() => {
    if (panelRef.current !== null) setRatios(measureRatios(panelRef.current));
  }, []);

  return (
    <div
      ref={panelRef}
      data-theme={theme}
      className="rounded-card border border-border bg-paper p-5"
    >
      <h3 className="m-0 mb-4 text-xl font-bold">{t(`colours.${theme}`)}</h3>
      <ul className="m-0 grid list-none gap-2 p-0">
        {contrastPairs.map((pair) => {
          const ratio = ratios[`${pair.foreground}/${pair.background}`];
          return (
            <li
              key={`${pair.foreground}/${pair.background}`}
              className="flex items-center justify-between gap-3 rounded-xl border-2 px-3 py-2 text-sm"
              style={{
                backgroundColor: `var(--${pair.background})`,
                color: pair.minimumRatio === 3 ? 'var(--ink)' : `var(--${pair.foreground})`,
                borderColor: pair.minimumRatio === 3 ? `var(--${pair.foreground})` : 'transparent',
              }}
            >
              <span>
                {t('colours.on', { foreground: pair.foreground, background: pair.background })}
              </span>
              <span className="font-semibold">
                {ratio === undefined ? '' : t('colours.ratio', { ratio: ratio.toFixed(2) })}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
