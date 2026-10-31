/**
 * Which music and video links a writer may add, and where each one plays from (story S1-E3-10
 * criteria 1 to 3; ADR 0008).
 */
import { describe, expect, it } from 'vitest';

import { embedKindOf, isEmbedService, parseEmbedLink, playerAddressFor } from './embed-links';

describe('parseEmbedLink', () => {
  it('reads YouTube links in every common shape and drops tracking parameters', () => {
    const expected = {
      service: 'youtube',
      mediaPath: 'dQw4w9WgXcQ',
      sourceUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    };
    expect(parseEmbedLink('https://www.youtube.com/watch?v=dQw4w9WgXcQ&si=abc')).toEqual(expected);
    expect(parseEmbedLink('youtu.be/dQw4w9WgXcQ?t=10')).toEqual(expected);
    expect(parseEmbedLink('https://m.youtube.com/shorts/dQw4w9WgXcQ')).toEqual(expected);
  });

  it('reads Vimeo, Loom, Spotify and Apple Music links', () => {
    expect(parseEmbedLink('https://vimeo.com/76979871')?.mediaPath).toBe('76979871');
    expect(parseEmbedLink('https://vimeo.com/76979871/abc123ef')?.mediaPath).toBe(
      '76979871?h=abc123ef',
    );
    const loomId = '0123456789abcdef0123456789abcdef';
    expect(parseEmbedLink(`https://www.loom.com/share/${loomId}`)?.mediaPath).toBe(loomId);
    expect(
      parseEmbedLink('https://open.spotify.com/intl-ro/track/4uLU6hMCjMI75M1A2tKUQC?si=x')
        ?.mediaPath,
    ).toBe('track/4uLU6hMCjMI75M1A2tKUQC');
    expect(
      parseEmbedLink('https://music.apple.com/ro/album/some-album/1440857781?i=1440857795')
        ?.mediaPath,
    ).toBe('ro/album/some-album/1440857781?i=1440857795');
  });

  it('refuses any other site, a look-alike host and a script address', () => {
    expect(parseEmbedLink('https://example.org/watch?v=dQw4w9WgXcQ')).toBeNull();
    expect(parseEmbedLink('https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ')).toBeNull();
    expect(parseEmbedLink('javascript:alert(1)')).toBeNull();
    expect(parseEmbedLink('https://www.youtube.com/watch?v=short')).toBeNull();
    expect(parseEmbedLink('')).toBeNull();
  });
});

describe('playerAddressFor', () => {
  it('plays YouTube from youtube-nocookie.com and Vimeo with do-not-track', () => {
    expect(playerAddressFor('youtube', 'dQw4w9WgXcQ')).toBe(
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1',
    );
    expect(playerAddressFor('vimeo', '76979871?h=abc123ef')).toBe(
      'https://player.vimeo.com/video/76979871?dnt=1&autoplay=1&h=abc123ef',
    );
    expect(playerAddressFor('spotify', 'track/4uLU6hMCjMI75M1A2tKUQC')).toBe(
      'https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC',
    );
  });

  it('labels music and video and knows the allowed services', () => {
    expect(embedKindOf('spotify')).toBe('music');
    expect(embedKindOf('loom')).toBe('video');
    expect(isEmbedService('apple_music')).toBe(true);
    expect(isEmbedService('soundcloud')).toBe(false);
  });
});
