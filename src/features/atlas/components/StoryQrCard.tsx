/**
 * StoryQrCard: "QR code" on the Marketing page (bundle G10c3, board AtlasMarketing: "For
 * posters, flyers and bookmarks. People scan it with a phone camera and land on your story").
 *
 * A glass card: "Where it takes people" (the story page; the story's world while the writer
 * shares it; the writer's profile), the code itself with its address written under it, and
 * "Download PNG" and "Download SVG". The code is drawn in the browser the moment a place is
 * picked, so there is no separate "Create" step, and nothing is stored or counted (rule 7).
 * The address comes from the brand settings, never a hard-coded domain.
 * Who uses it: MarketingPage. What it calls: lib/storyQr.ts, lib/downloadQr.ts, useMyNames (the
 * username) and usePlanVisibility (whether the story's world is shared).
 */
import { useMemo, useState } from 'react';

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

/** The choices for this story and writer, read from what is already loaded. */
function useQrChoices(slug: string): QrChoice[] {
  const { names } = useMyNames();
  const { visibility } = usePlanVisibility(slug);
  const handle = names?.handle ?? null;
  const isWorldShared = visibility?.areas.includes('bible') ?? false;
  return qrChoices(slug, handle === '' ? null : handle, isWorldShared);
}

/** The code on white, with the address it holds written under it. */
function QrFigure({ address, path }: { address: string; path: string }) {
  const { t } = useAtlasTranslation();
  // Working the code out takes a few milliseconds; do it once per address.
  const drawing = useMemo(() => {
    const modules = qrModulesFor(address);
    return { size: modules.length + qrQuietZone * 2, path: qrPathFor(modules, qrQuietZone) };
  }, [address]);
  return (
    // White whatever the theme: scanners need dark squares on a light ground.
    <figure className="m-0 flex shrink-0 flex-col items-center gap-1.5 self-center rounded-[20px] bg-white p-3 shadow-card">
      <svg
        role="img"
        aria-label={t('marketing.qr.codeLabel', { path })}
        viewBox={`0 0 ${drawing.size} ${drawing.size}`}
        shapeRendering="crispEdges"
        data-testid="atlas-story-qr"
        className="h-[168px] w-[168px]"
      >
        <rect width={drawing.size} height={drawing.size} fill="#fff" />
        <path d={drawing.path} fill="#000" />
      </svg>
      <figcaption className="max-w-[168px] text-center text-xs break-all text-[#141114]">
        {path}
      </figcaption>
    </figure>
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
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          className="h-9 px-4 text-[13px]"
          onClick={() => void download('png')}
        >
          {t('marketing.qr.downloadPng')}
        </Button>
        <Button
          variant="secondary"
          className="h-9 px-4 text-[13px]"
          onClick={() => void download('svg')}
        >
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
 * Renders the card.
 *
 * @param props.slug - the story's slug
 * @returns the "QR code" card
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
    <section
      aria-labelledby="atlas-story-qr-heading"
      className="flex min-w-0 flex-col gap-3.5 rounded-card border border-border bg-surface px-7 py-[26px] shadow-card"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2
          id="atlas-story-qr-heading"
          className="m-0 font-heading text-[26px] leading-[1.1] font-bold text-heading"
        >
          {t('marketing.qr.heading')}
        </h2>
        <p className="m-0 text-sm text-meta">{t('marketing.qr.use')}</p>
      </div>
      <p className="m-0 text-sm text-meta">{t('marketing.qr.hint')}</p>
      <div className="flex flex-wrap items-start gap-6">
        <div className="flex min-w-0 flex-1 basis-56 flex-col gap-3">
          <Select
            id="atlas-story-qr-destination"
            label={t('marketing.qr.destination')}
            isLabelVisible
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
          <p className="m-0 text-xs text-meta">{t('marketing.qr.whoCanOpen')}</p>
          <QrDownloads
            address={address}
            fileBase={(kind) => qrFileName(slug, choice.destination, kind)}
          />
        </div>
        <QrFigure address={address} path={choice.path} />
      </div>
    </section>
  );
}
