/**
 * StoryQrCard: "QR code" on the Marketing page (bundle G10c3; redrawn by user stories bundle 6,
 * story 6.13, board E32: "QR code: pick where it goes (the story page; the story's world when it
 * is shared; the profile), then Download PNG or SVG. It works only while the story is published").
 *
 * A section between hairlines, as board E32 draws it: the line saying what it is for, then the
 * code beside its controls: "Where it takes people", the address it holds, who can open it, and
 * the quiet "Download PNG" and "Download SVG" with their icons. The code is drawn in the browser
 * the moment a place is picked, so there is no separate "Create" step, and nothing is stored or
 * counted (rule 7). The address comes from the brand settings, never a hard-coded domain.
 * Who uses it: MarketingPage. What it calls: lib/storyQr.ts, lib/downloadQr.ts, useMyNames (the
 * username), usePlanVisibility (whether the story's world is shared) and MarketingSection.
 */
import { useMemo, useState } from 'react';

import { ActionIcon } from '@/components/icons/ActionIcon';
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { Select } from '@/components/ui/Select';
import { brand } from '@/config/brand';
import { useMyNames } from '@/features/account/hooks/useMyNames';
import { qrModulesFor, qrPathFor } from '@/features/spaces/lib/qrModules';

import { usePlanVisibility } from '../hooks/usePlanVisibility';
import { downloadQrPng, downloadQrSvg } from '../lib/downloadQr';
import {
  qrChoices,
  qrFileName,
  qrQuietZone,
  qrSvgFile,
  type QrChoice,
  type QrDestination,
} from '../lib/storyQr';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { MarketingSection } from './MarketingSection';

/** The choices for this story and writer, read from what is already loaded. */
function useQrChoices(slug: string): QrChoice[] {
  const { names } = useMyNames();
  const { visibility } = usePlanVisibility(slug);
  const handle = names?.handle ?? null;
  const isWorldShared = visibility?.areas.includes('bible') ?? false;
  return qrChoices(slug, handle === '' ? null : handle, isWorldShared);
}

/** The code on white, 148 px as board E32 draws it; the address is written beside it. */
function QrFigure({ address, path }: { address: string; path: string }) {
  const { t } = useAtlasTranslation();
  // Working the code out takes a few milliseconds; do it once per address.
  const drawing = useMemo(() => {
    const modules = qrModulesFor(address);
    return { size: modules.length + qrQuietZone * 2, path: qrPathFor(modules, qrQuietZone) };
  }, [address]);
  return (
    // White whatever the theme: scanners need dark squares on a light ground. The quiet zone
    // is drawn inside the picture, so the box needs no padding of its own.
    <svg
      role="img"
      aria-label={t('marketing.qr.codeLabel', { path })}
      viewBox={`0 0 ${drawing.size} ${drawing.size}`}
      shapeRendering="crispEdges"
      data-testid="atlas-story-qr"
      className="size-[148px] shrink-0 rounded-field"
    >
      <rect width={drawing.size} height={drawing.size} fill="#fff" />
      <path d={drawing.path} fill="#000" />
    </svg>
  );
}

/** "Download PNG" and "Download SVG"; a browser that can't draw the PNG gets a plain message. */
function QrDownloads({
  address,
  fileBase,
}: {
  address: string;
  fileBase: (kind: 'png' | 'svg') => string;
}) {
  const { t } = useAtlasTranslation();
  const [hasFailed, setHasFailed] = useState(false);

  /** Makes the file in the browser and starts the download. */
  async function download(kind: 'png' | 'svg') {
    setHasFailed(false);
    if (kind === 'svg') return downloadQrSvg(qrSvgFile(address), fileBase(kind));
    await downloadQrPng(qrSvgFile(address), fileBase(kind)).catch(() => setHasFailed(true));
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" onClick={() => void download('png')}>
          <ActionIcon name="download" size={16} />
          {t('marketing.qr.downloadPng')}
        </Button>
        <Button variant="secondary" onClick={() => void download('svg')}>
          <ActionIcon name="download" size={16} />
          {t('marketing.qr.downloadSvg')}
        </Button>
      </div>
      <div aria-live="polite">
        {hasFailed && <Notice tone="error">{t('marketing.qr.failed')}</Notice>}
      </div>
    </>
  );
}

/**
 * Renders the section.
 *
 * @param props.slug - the story's slug
 * @returns the "QR code" section
 */
export function StoryQrCard({ slug }: { slug: string }) {
  const { t } = useAtlasTranslation();
  const choices = useQrChoices(slug);
  const [picked, setPicked] = useState<QrDestination>('story');
  // A place that stops being offered (the world made private) falls back to the story page.
  const choice = choices.find((candidate) => candidate.destination === picked) ?? choices[0];
  if (choice === undefined) return null;
  const address = `${brand.siteUrl}${choice.path}`;

  return (
    <MarketingSection id="atlas-story-qr-heading" heading={t('marketing.qr.heading')}>
      <p className="m-0 type-meta text-ink-muted">{t('marketing.qr.hint')}</p>
      <div className="flex flex-wrap items-start gap-6">
        <QrFigure address={address} path={choice.path} />
        <div className="flex min-w-0 flex-col gap-3">
          <Select
            id="atlas-story-qr-destination"
            label={t('marketing.qr.destination')}
            isLabelVisible
            isLabelAbove
            options={choices.map((option) => ({
              value: option.destination,
              label: t(`marketing.qr.destinations.${option.destination}`),
            }))}
            value={choice.destination}
            onChange={(value) =>
              setPicked(
                choices.find((option) => option.destination === value)?.destination ?? 'story',
              )
            }
          />
          {/* The address the code holds, without "https://", as board E32 writes it. */}
          <p
            data-testid="atlas-story-qr-address"
            className="m-0 type-meta break-all text-ink-muted"
          >
            {`${brand.siteDomain}${choice.path}`}
          </p>
          <p className="m-0 type-meta text-ink-muted">{t('marketing.qr.whoCanOpen')}</p>
          <QrDownloads
            address={address}
            fileBase={(kind) => qrFileName(slug, choice.destination, kind)}
          />
        </div>
      </div>
    </MarketingSection>
  );
}
