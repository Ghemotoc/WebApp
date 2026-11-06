/**
 * ChapterEmbed: one music or video card inside a chapter, as readers see it (story S1-E3-10;
 * board 3.5, "Video from YouTube", before and after play; ADR 0008).
 *
 * What it shows:
 * - before play: a card with the service ("Video · YouTube"), the title, "Plays from YouTube.
 *   YouTube may use cookies.", that the service's own terms apply after play (the story's legal
 *   note), who added it and a Report button. Nothing at all loads from the
 *   service: no player, no thumbnail, no script (criterion 2; CLAUDE.md rule 7);
 * - after the reader presses play: the service's own player, from its privacy-enhanced address
 *   (youtube-nocookie.com, Vimeo with do-not-track; criterion 3, src/lib/embed-links.ts), and a
 *   Stop button that takes the player away again;
 * - removed by a moderator: "[Removed by the moderation team]" (criterion 4, architecture 1.7.11).
 * No doodles: the chapter reader never has them (DoD design rules). The service's logo slot on the
 * board waits for each brand kit's official logo (GO-LIVE; docs/board-fixes.md).
 * Who uses it: ChapterText (the reader, the teaser and the writer's preview).
 * What it calls: the shared ReportButton (S1-E10-01), with the card's ID.
 */
import { useEffect, useRef, useState, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';

import { ReportButton } from '@/features/reporting/components/ReportButton';
import { EMBED_SERVICE_NAMES, embedKindOf, playerAddressFor } from '@/lib/embed-links';

import type { EmbedView } from '../api/embeds';

import { EmbedPlayer } from './EmbedPlayer';

/** What the card needs. */
export interface ChapterEmbedProps {
  embedId: string;
  /** The title written in the text, for when the service gave none. */
  fallbackTitle: string;
  /** Its service, what to play and its title; undefined when the answer didn't include it. */
  view: EmbedView | undefined;
  /** The writer's name, for "Added by". */
  writerName: string | null;
  /** False in the writer's preview, where there is nothing to report. */
  canReport: boolean;
}

/**
 * Whether the card plays, and keeping keyboard focus in the card when its button swaps: Play
 * hands focus to Stop, and Stop hands it back to Play (WCAG 2.2, 2.4.3 focus order). Nothing
 * moves before the first press.
 *
 * @returns isPlaying, play(), stop() and the refs for the two buttons
 */
function usePlayback() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasPressed, setHasPressed] = useState(false);
  const stopRef = useRef<HTMLButtonElement>(null);
  const playRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!hasPressed) return;
    if (isPlaying) stopRef.current?.focus();
    else playRef.current?.focus();
  }, [isPlaying, hasPressed]);
  /** Starts the player (the first and only moment anything loads from the service). */
  function play() {
    setHasPressed(true);
    setIsPlaying(true);
  }
  return { isPlaying, play, stop: () => setIsPlaying(false), stopRef, playRef };
}

/** The box shown instead of a card that was removed or couldn't be read. */
function EmbedPlaceholder({ text }: { text: string }) {
  return (
    <div className="my-7 flex min-h-24 items-center justify-center rounded-[16px] border border-dashed border-control-border bg-paper px-6 py-6 text-center">
      <p className="m-0 text-[15px] font-semibold text-heading">{text}</p>
    </div>
  );
}

/** What the card's lower row needs. */
interface EmbedActionsProps {
  embedId: string;
  kind: 'music' | 'video';
  title: string;
  writerName: string | null;
  canReport: boolean;
  isPlaying: boolean;
  stopRef: RefObject<HTMLButtonElement | null>;
  onStop: () => void;
}

/** Stop (while playing), "Added by" and Report. */
function EmbedActions({
  embedId,
  kind,
  title,
  writerName,
  canReport,
  isPlaying,
  stopRef,
  onStop,
}: EmbedActionsProps) {
  const { t } = useTranslation('reading');
  return (
    <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
      {isPlaying && (
        <button
          ref={stopRef}
          type="button"
          onClick={onStop}
          className="inline-flex h-11 items-center rounded-full border border-control-border px-[18px] text-sm font-semibold text-heading hover:bg-tint"
        >
          {t('embed.stop')}
        </button>
      )}
      {writerName !== null && (
        <span className="text-[13px] text-meta">{t('embed.addedBy', { name: writerName })}</span>
      )}
      {canReport && (
        <span className="ml-auto">
          <ReportButton
            itemType="embed"
            itemReference={embedId}
            itemLabel={t(`embed.reportLabel.${kind}`, { title })}
          />
        </span>
      )}
    </div>
  );
}

/**
 * Renders the card, or the box in its place.
 *
 * @returns a group with the play button or the player, never touching the text around it
 */
export function ChapterEmbed(props: ChapterEmbedProps) {
  const { embedId, fallbackTitle, view } = props;
  const { t } = useTranslation('reading');
  const { isPlaying, play, stop, stopRef, playRef } = usePlayback();
  if (view?.state === 'removed') return <EmbedPlaceholder text={t('embed.removed')} />;
  if (view === undefined) return <EmbedPlaceholder text={t('embed.notLoaded')} />;

  // The words the card needs: "Video" or "Music", the service and the title.
  const service = EMBED_SERVICE_NAMES[view.service];
  const kind = embedKindOf(view.service);
  const title = view.title ?? (fallbackTitle.trim() === '' ? service : fallbackTitle);
  return (
    <div
      role="group"
      aria-label={t(`embed.groupLabel.${kind}`, { service })}
      data-chapter-embed={embedId}
      className="my-7 flex flex-wrap overflow-hidden rounded-[16px] border border-border bg-surface"
    >
      <EmbedPlayer
        kind={kind}
        isPlaying={isPlaying}
        playerAddress={playerAddressFor(view.service, view.mediaPath)}
        playLabel={t(`embed.play.${kind}`, { title, service })}
        playerTitle={t('embed.playerTitle', { title, service })}
        playButtonRef={playRef}
        onPlay={play}
      />
      <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-1.5 px-5 py-4">
        <p className="m-0 eyebrow">{t(`embed.eyebrow.${kind}`, { service })}</p>
        <p className="m-0 font-heading text-xl leading-tight font-bold text-ink">{title}</p>
        <p className="m-0 text-sm text-body">{t('embed.cookies', { service })}</p>
        <p className="m-0 text-[13px] text-meta">{t('embed.terms', { service })}</p>
        <EmbedActions
          embedId={embedId}
          kind={kind}
          title={title}
          writerName={props.writerName}
          canReport={props.canReport}
          isPlaying={isPlaying}
          stopRef={stopRef}
          onStop={stop}
        />
      </div>
    </div>
  );
}
