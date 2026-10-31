/**
 * Music and video links from other services: which links are allowed, and the player address each
 * one plays from (story S1-E3-10; ADR 0008, click to load).
 *
 * The allowed list is Spotify and Apple Music for music, YouTube, Vimeo and Loom for video (S1-E3-10
 * criterion 1; "Lumo" is Loom, Q22). A link is turned into two parts: the service and the
 * "media path", the few characters that name the song or video on that service (a YouTube video ID,
 * "track/<ID>" on Spotify). The player host is fixed here for each service, so a stored media path
 * can only ever play from that service's own player, never from an address someone typed.
 * The database checks the same shapes again (chapter_embeds_media_path_shape, …_s1_e3_10_…sql).
 * Who uses it: server/embeds.ts (the /api/embed function, before it fetches the oEmbed data),
 * the Add music or video dialog (to say early that a link isn't allowed) and ChapterEmbed (the
 * reader's player, only once the reader presses play).
 */

/** The services a writer may add from (S1-E3-10 criterion 1). */
export const EMBED_SERVICES = ['youtube', 'vimeo', 'loom', 'spotify', 'apple_music'] as const;

/** One allowed service. */
export type EmbedService = (typeof EMBED_SERVICES)[number];

/** A link the writer pasted, understood. */
export interface ParsedEmbedLink {
  service: EmbedService;
  /** What names the song or video on the service, for example a YouTube video ID. */
  mediaPath: string;
  /** The link in a clean form (https, no tracking parameters), for oEmbed and for moderators. */
  sourceUrl: string;
}

/** Whether a service plays music or video, for the card's label ("Video · YouTube"). */
export function embedKindOf(service: EmbedService): 'music' | 'video' {
  if (service === 'spotify' || service === 'apple_music') return 'music';
  return 'video';
}

/** The service's name as people write it; brand names stay the same in every language. */
export const EMBED_SERVICE_NAMES: Record<EmbedService, string> = {
  youtube: 'YouTube',
  vimeo: 'Vimeo',
  loom: 'Loom',
  spotify: 'Spotify',
  apple_music: 'Apple Music',
};

/**
 * Reads a link as an address, accepting one pasted without "https://".
 *
 * @param link - what the writer pasted
 * @returns the address, or null when it isn't one or isn't http(s)
 */
function addressOf(link: string): URL | null {
  const trimmed = link.trim();
  if (trimmed === '' || trimmed.length > 500) return null;
  const withScheme = /^[a-z]+:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const address = new URL(withScheme);
    if (address.protocol !== 'https:' && address.protocol !== 'http:') return null;
    return address;
  } catch {
    return null;
  }
}

/**
 * A YouTube link: youtube.com/watch?v=, youtu.be/, /shorts/ or /embed/, with an 11-character ID.
 *
 * @returns the video ID, or null
 */
function youtubeIdOf(address: URL): string | null {
  const host = address.hostname.replace(/^(www\.|m\.|music\.)/, '');
  let candidate: string | null = null;
  if (host === 'youtu.be') candidate = address.pathname.split('/')[1] ?? null;
  if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    const shortPath = /^\/(shorts|embed|live)\/([^/]+)/.exec(address.pathname);
    candidate = shortPath?.[2] ?? address.searchParams.get('v');
  }
  if (candidate === null || !/^[A-Za-z0-9_-]{11}$/.test(candidate)) return null;
  return candidate;
}

/**
 * A Vimeo link: vimeo.com/<number>, with the private-link hash when there is one.
 *
 * @returns "<number>" or "<number>?h=<hash>", or null
 */
function vimeoPathOf(address: URL): string | null {
  const host = address.hostname.replace(/^www\./, '');
  if (host !== 'vimeo.com' && host !== 'player.vimeo.com') return null;
  const match = /^\/(?:video\/)?(\d{1,12})(?:\/([0-9a-f]{6,20}))?\/?$/.exec(address.pathname);
  if (match === null) return null;
  const hash = match[2] ?? address.searchParams.get('h');
  if (hash !== null && /^[0-9a-f]{6,20}$/.test(hash)) return `${match[1]}?h=${hash}`;
  return match[1] ?? null;
}

/**
 * A Loom link: loom.com/share/<32 hex characters> (or /embed/).
 *
 * @returns the video ID, or null
 */
function loomIdOf(address: URL): string | null {
  const host = address.hostname.replace(/^www\./, '');
  if (host !== 'loom.com') return null;
  const match = /^\/(?:share|embed)\/([0-9a-f]{32})\/?$/.exec(address.pathname);
  return match?.[1] ?? null;
}

/**
 * A Spotify link: open.spotify.com/(intl-xx/)<type>/<22-character ID>.
 *
 * @returns "<type>/<ID>", or null
 */
function spotifyPathOf(address: URL): string | null {
  if (address.hostname !== 'open.spotify.com') return null;
  const match =
    /^\/(?:intl-[a-z]{2}(?:-[a-z]{2})?\/)?(?:embed\/)?(track|album|playlist|episode|show|artist)\/([A-Za-z0-9]{22})\/?$/.exec(
      address.pathname,
    );
  if (match === null) return null;
  return `${match[1]}/${match[2]}`;
}

/**
 * An Apple Music link: music.apple.com/<country>/<album|playlist|song|music-video>/<name>/<ID>,
 * with "?i=<song ID>" for one song on an album.
 *
 * @returns "<country>/<type>/<name>/<ID>" with the "?i=" part when there is one, or null
 */
function appleMusicPathOf(address: URL): string | null {
  if (address.hostname !== 'music.apple.com' && address.hostname !== 'embed.music.apple.com')
    return null;
  const match =
    /^\/([a-z]{2})\/(album|playlist|song|music-video)\/([a-z0-9-]{1,120})\/((?:pl\.)?[A-Za-z0-9-]{1,64})\/?$/.exec(
      address.pathname,
    );
  if (match === null) return null;
  const songId = address.searchParams.get('i');
  const path = `${match[1]}/${match[2]}/${match[3]}/${match[4]}`;
  if (songId !== null && /^\d{1,20}$/.test(songId)) return `${path}?i=${songId}`;
  return path;
}

/** The clean link for each service, from its media path (the one oEmbed and moderators see). */
function sourceUrlFor(service: EmbedService, mediaPath: string): string {
  const [path = '', query] = mediaPath.split('?');
  switch (service) {
    case 'youtube':
      return `https://www.youtube.com/watch?v=${mediaPath}`;
    case 'vimeo':
      return query === undefined
        ? `https://vimeo.com/${path}`
        : `https://vimeo.com/${path}/${query.slice(2)}`;
    case 'loom':
      return `https://www.loom.com/share/${mediaPath}`;
    case 'spotify':
      return `https://open.spotify.com/${mediaPath}`;
    case 'apple_music':
      return `https://music.apple.com/${mediaPath}`;
  }
}

/** Each service's reader, tried in turn. */
const readers: Array<[EmbedService, (address: URL) => string | null]> = [
  ['youtube', youtubeIdOf],
  ['vimeo', vimeoPathOf],
  ['loom', loomIdOf],
  ['spotify', spotifyPathOf],
  ['apple_music', appleMusicPathOf],
];

/**
 * Understands a pasted link, if it comes from an allowed service.
 *
 * @param link - what the writer pasted
 * @returns the service, the media path and the clean link; null for any other link
 */
export function parseEmbedLink(link: string): ParsedEmbedLink | null {
  const address = addressOf(link);
  if (address === null) return null;
  for (const [service, readMediaPath] of readers) {
    const mediaPath = readMediaPath(address);
    if (mediaPath !== null) {
      return { service, mediaPath, sourceUrl: sourceUrlFor(service, mediaPath) };
    }
  }
  return null;
}

/**
 * The player address for a stored embed, loaded only after the reader presses play
 * (S1-E3-10 criteria 2 and 3).
 * YouTube plays from youtube-nocookie.com (the privacy-enhanced player) and Vimeo with dnt=1
 * (do not track); both are the services' own promises, checked when the story was built (ADR 0008).
 *
 * @param service - the stored service
 * @param mediaPath - the stored media path
 * @returns the address for the player's iframe
 */
export function playerAddressFor(service: EmbedService, mediaPath: string): string {
  const [path = '', query] = mediaPath.split('?');
  switch (service) {
    case 'youtube':
      return `https://www.youtube-nocookie.com/embed/${mediaPath}?autoplay=1`;
    case 'vimeo':
      return `https://player.vimeo.com/video/${path}?dnt=1&autoplay=1${query === undefined ? '' : `&${query}`}`;
    case 'loom':
      return `https://www.loom.com/embed/${mediaPath}?autoplay=1`;
    case 'spotify':
      return `https://open.spotify.com/embed/${mediaPath}`;
    case 'apple_music':
      return `https://embed.music.apple.com/${mediaPath}`;
  }
}

/**
 * Whether a stored value is one of the allowed services.
 *
 * @param value - a service name from the database
 * @returns true for youtube, vimeo, loom, spotify or apple_music
 */
export function isEmbedService(value: unknown): value is EmbedService {
  return typeof value === 'string' && (EMBED_SERVICES as readonly string[]).includes(value);
}
