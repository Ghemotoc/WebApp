/**
 * ListBackgroundsTab: Staff › Website › Genre and tag pages, where the owner and admins choose the
 * deep band at the top of each genre and tag page, for every market or for one (bundle G12b; the
 * canvas's StaffWebsite board).
 *
 * The market drop-down starts on "Everywhere": a colour set there shows in every market unless a
 * market has its own. Below it, the genres (each with its colour, or its own accent by default)
 * and the tags that have a band, each with Edit; "Add a tag background" opens the editor for any
 * approved tag. The editor card sits beside the lists. Every change is in the audit log, linked
 * as "Staff history".
 * Who shows it: WebsiteAdminPage at /staff/website/list-pages. What it calls: the hooks in
 * hooks/useListPageBackgrounds.ts, useMarkets, useStoryFormOptions (the genres) and
 * ListBackgroundEditor.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { Notice } from '@/components/ui/Notice';
import { Select } from '@/components/ui/Select';
import { countryName } from '@/features/safety/lib/countries';

import {
  BackgroundSaveError,
  type BackgroundPlace,
  type ListBackground,
} from '../../api/staff/listPageBackgrounds';
import {
  useClearListBackground,
  useListBackgrounds,
  useSaveListBackground,
} from '../../hooks/useListPageBackgrounds';
import { useMarkets } from '../../hooks/useMarkets';
import { pageNameFor, startToneFor } from '../../lib/listBackgrounds';

import { GenreBackgroundRows, TagBackgroundRows } from './ListBackgroundRows';
import { ListBackgroundEditor } from './ListBackgroundEditor';

/** What the page says after a change: nothing, saved, cleared, or a failure word. */
type ChangeMessage = 'none' | 'saved' | 'cleared' | BackgroundSaveError['failure'];

/**
 * "Market: Everywhere": which market the lists and the editor are for.
 *
 * @returns the drop-down and its note
 */
function MarketChoice({
  market,
  onChange,
}: {
  market: string | null;
  onChange: (market: string | null) => void;
}) {
  const { t, i18n } = useTranslation('websiteAdmin');
  const markets = useMarkets();
  const options = [
    { value: '', label: t('listBackgrounds.everywhere') },
    ...markets.map((candidate) => ({
      value: candidate.countryCode,
      label: countryName(candidate.countryCode, i18n.language),
    })),
  ];
  return (
    <div className="flex flex-col gap-2">
      <Select
        id="list-background-market"
        label={t('listBackgrounds.market')}
        isLabelVisible
        placement="form"
        value={market ?? ''}
        options={options}
        onChange={(picked) => onChange(picked === '' ? null : picked)}
        descriptionId="list-background-market-note"
      />
      <p id="list-background-market-note" className="m-0 text-sm text-meta">
        {t('listBackgrounds.marketNote')}
      </p>
    </div>
  );
}

/**
 * The message after a change: saved, cleared or the failure, in words.
 *
 * @returns the notice, or nothing
 */
function ChangeNotice({ message }: { message: ChangeMessage }) {
  const { t } = useTranslation('websiteAdmin');
  if (message === 'none') return null;
  if (message === 'saved' || message === 'cleared') {
    return <Notice tone="success">{t(`listBackgrounds.${message}`)}</Notice>;
  }
  return <Notice tone="error">{t(`listBackgrounds.failures.${message}`)}</Notice>;
}

/**
 * The editor card for one page, wired to save and clear.
 *
 * @returns the card beside the lists
 */
function EditorPanel({
  place,
  inMarket,
  onDone,
}: {
  place: BackgroundPlace;
  inMarket: readonly ListBackground[];
  onDone: (message: ChangeMessage) => void;
}) {
  const { t } = useTranslation('websiteAdmin');
  const save = useSaveListBackground();
  const clear = useClearListBackground();
  /** What a refused change says. */
  const failureOf = (error: unknown) =>
    error instanceof BackgroundSaveError ? error.failure : 'unreachable';
  return (
    <div className="flex min-w-0 flex-[1_1_320px] flex-col">
      <ListBackgroundEditor
        place={place}
        pageName={pageNameFor(place, t)}
        startTone={startToneFor(place, inMarket)}
        hasChoice={inMarket.some((row) => row.kind === place.kind && row.key === place.key)}
        isBusy={save.isPending || clear.isPending}
        onCancel={() => onDone('none')}
        onSave={(palette) =>
          save.mutate(
            { place, palette },
            { onSuccess: () => onDone('saved'), onError: (error) => onDone(failureOf(error)) },
          )
        }
        onClear={() =>
          clear.mutate(place, {
            onSuccess: () => onDone('cleared'),
            onError: (error) => onDone(failureOf(error)),
          })
        }
      />
    </div>
  );
}

/**
 * Renders the tab.
 *
 * @returns the market choice, the lists, the editor and the messages
 */
export function ListBackgroundsTab() {
  const { t } = useTranslation('websiteAdmin');
  const backgrounds = useListBackgrounds();
  const [market, setMarket] = useState<string | null>(null);
  const [editing, setEditing] = useState<BackgroundPlace | null>(null);
  const [message, setMessage] = useState<ChangeMessage>('none');

  // Step 1: the saved choices must load first.
  if (backgrounds.isError) return <Notice tone="error">{t('failures.unreachable')}</Notice>;
  if (backgrounds.isPending) return null;
  const inMarket = backgrounds.data.filter((background) => background.market === market);

  /** Opens the editor for a page, in the chosen market. */
  const startEditing = (kind: BackgroundPlace['kind'], key: string) => {
    setMessage('none');
    setEditing({ kind, key, market });
  };

  return (
    <div className="flex flex-col gap-6">
      <MarketChoice
        market={market}
        onChange={(picked) => {
          setMarket(picked);
          setEditing(null);
        }}
      />
      <ChangeNotice message={message} />
      <div className="flex flex-wrap items-start gap-6">
        <div className="flex min-w-0 flex-[999_1_420px] flex-col gap-6">
          <GenreBackgroundRows
            backgrounds={inMarket}
            onEdit={(key) => startEditing('category', key)}
          />
          <TagBackgroundRows backgrounds={inMarket} onEdit={(key) => startEditing('tag', key)} />
          <Link
            to="/staff/audit-log?action=website.list_background"
            className="inline-flex min-h-6 w-fit items-center text-sm text-link underline"
          >
            {t('listBackgrounds.history')}
          </Link>
        </div>
        {editing !== null && (
          <EditorPanel
            key={`${editing.kind}:${editing.key}:${editing.market ?? ''}`}
            place={editing}
            inMarket={inMarket}
            onDone={(done) => {
              setEditing(null);
              setMessage(done);
            }}
          />
        )}
      </div>
    </div>
  );
}
