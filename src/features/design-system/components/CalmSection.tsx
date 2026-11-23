/**
 * CalmSection: the simplified design's hero, meter, switch and sheet on /design (bundle CALM-4),
 * so they can be seen and tested in one place.
 * Who uses it: DesignPage. What it calls: Hero, Meter, Switch, Sheet and Button.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Hero } from '@/components/ui/Hero';
import { Meter } from '@/components/ui/Meter';
import { Sheet } from '@/components/ui/Sheet';
import { Switch } from '@/components/ui/Switch';

import { DesignSection } from './DesignSection';

/** The meter's sample: 3 of 10. */
const sampleRead = 3;
const sampleTotal = 10;

/**
 * Renders the section.
 *
 * @returns the section
 */
export function CalmSection() {
  const { t } = useTranslation('design');
  const [isOn, setIsOn] = useState(true);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const progress = t('calm.meterValue', { read: sampleRead, total: sampleTotal });
  return (
    <DesignSection id="calm" title={t('sections.calm')}>
      <Hero labelledBy="design-hero-title" className="max-w-[720px]">
        <h3 id="design-hero-title" className="m-0 type-heading text-ink-heading">
          {t('calm.heroTitle')}
        </h3>
        <p className="m-0 text-ink-muted">{t('calm.heroText')}</p>
        <Meter
          label={t('calm.meterLabel')}
          value={sampleRead}
          max={sampleTotal}
          valueText={progress}
        />
        <p className="m-0 type-meta">{progress}</p>
      </Hero>
      <div className="flex flex-wrap items-center gap-6">
        <Switch
          label={t('calm.switchLabel')}
          isOn={isOn}
          onToggle={() => setIsOn(!isOn)}
          stateWord={isOn ? t('calm.on') : t('calm.off')}
        />
        <Button variant="secondary" aria-haspopup="dialog" onClick={() => setIsSheetOpen(true)}>
          {t('calm.openSheet')}
        </Button>
      </div>
      <Sheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        title={t('calm.sheetTitle')}
      >
        <ul className="m-0 list-none divide-y divide-border p-0">
          <li className="py-3">{t('calm.sheetRowOne')}</li>
          <li className="py-3">{t('calm.sheetRowTwo')}</li>
        </ul>
      </Sheet>
    </DesignSection>
  );
}
