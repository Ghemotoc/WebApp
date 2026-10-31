/**
 * EmbedPlayer: the left part of a music or video card: the play button, and once it is pressed,
 * the service's own player (story S1-E3-10 criteria 2 and 3; board 3.5; ADR 0008).
 *
 * Before play there is no iframe at all, so the service learns nothing and sets nothing. After
 * play the iframe loads the address from src/lib/embed-links.ts (YouTube's no-cookie player,
 * Vimeo with do-not-track). It is sandboxed to what a player needs (scripts, its own storage,
 * full screen and opening the service in a new tab), sends no more than our site's address as the
 * referrer, and is given a title so a screen reader can name it.
 * Who uses it: ChapterEmbed.
 */

import type { RefObject } from 'react';

/** What the player part needs. */
export interface EmbedPlayerProps {
  kind: 'music' | 'video';
  isPlaying: boolean;
  /** The player address; only used once isPlaying is true. */
  playerAddress: string;
  /** The play button's name: "Play video: <title>. Plays from YouTube". */
  playLabel: string;
  /** The iframe's title, for screen readers. */
  playerTitle: string;
  /** So the card can put focus back on Play after Stop. */
  playButtonRef: RefObject<HTMLButtonElement | null>;
  onPlay: () => void;
}

/** A small "play" triangle, drawn as an SVG (icons are SVG, CLAUDE.md rule 16). */
function PlayIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

/**
 * Renders the play button or the player.
 *
 * @returns the panel; full width with the player in it once playing
 */
export function EmbedPlayer({
  kind,
  isPlaying,
  playerAddress,
  playLabel,
  playerTitle,
  playButtonRef,
  onPlay,
}: EmbedPlayerProps) {
  if (isPlaying) {
    // Video keeps the 16:9 frame; music players are short strips.
    const frameSize = kind === 'video' ? 'aspect-video' : 'h-[175px]';
    return (
      <div className="basis-full bg-primary">
        <iframe
          src={playerAddress}
          title={playerTitle}
          className={`block w-full border-0 ${frameSize}`}
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox="allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox"
        />
      </div>
    );
  }
  return (
    <div className="flex min-h-[170px] flex-[1_1_220px] items-center justify-center bg-primary p-4 text-on-primary">
      <button
        ref={playButtonRef}
        type="button"
        onClick={onPlay}
        aria-label={playLabel}
        className="inline-flex size-[68px] items-center justify-center rounded-full bg-on-primary text-primary hover:opacity-90"
      >
        <PlayIcon />
      </button>
    </div>
  );
}
