/**
 * PillSection: the six information pill tones and interactive chips on /design (story S1-E1-03).
 * Pills tell; chips do. A selected chip shows a tick and aria-pressed, not colour alone (DoD).
 * Who uses it: DesignPage.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Chip } from '@/components/ui/Chip';
import { InfoPill, type PillTone } from '@/components/ui/InfoPill';

import { DesignSection } from './DesignSection';

/** The tones in the order the DoD lists them. */
const pillTones: PillTone[] = ['plum', 'sage', 'gold', 'sky', 'neutral', 'blush'];

/** The sample chips. */
const chipKeys = ['chipFiction', 'chipPoetry', 'chipEssays'] as const;

/**
 * Renders the pills and chips.
 *
 * @returns the section
 */
export function PillSection() {
  const { t } = useTranslation('design');
  // The first chip starts selected, so both states are visible.
  const [pressedChips, setPressedChips] = useState<Record<string, boolean>>({ chipFiction: true });

  return (
    <DesignSection id="pills" title={t('sections.pills')}>
      <div className="flex flex-wrap gap-2">
        {pillTones.map((tone) => (
          <InfoPill key={tone} tone={tone}>
            {t(`pills.${tone}`)}
          </InfoPill>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {chipKeys.map((chipKey) => (
          <Chip
            key={chipKey}
            isPressed={pressedChips[chipKey] === true}
            onPressedChange={(isPressed) =>
              setPressedChips((previous) => ({ ...previous, [chipKey]: isPressed }))
            }
          >
            {t(`pills.${chipKey}`)}
          </Chip>
        ))}
      </div>
    </DesignSection>
  );
}
