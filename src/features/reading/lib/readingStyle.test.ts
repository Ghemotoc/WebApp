/**
 * Unit tests for the reader's text look (story S1-E4-02): the device's text size, the slider's
 * range and each setting's CSS value.
 */
import { describe, expect, it } from 'vitest';

import { defaultReadingSettings } from '../api/readingSettings';

import {
  clampTextSize,
  deviceTextSize,
  readingColumnWidth,
  readingTextStyle,
} from './readingStyle';

describe('the device text size', () => {
  it('is 19 px when the device uses the normal 16 px', () => {
    expect(deviceTextSize(16)).toBe(19);
  });

  it('grows with a device set to larger text, up to 28 px', () => {
    expect(deviceTextSize(20)).toBe(24);
    expect(deviceTextSize(40)).toBe(28);
  });

  it('falls back to 19 px when the size can not be read', () => {
    expect(deviceTextSize(Number.NaN)).toBe(19);
  });
});

describe('the reading text style', () => {
  it('follows the device until the reader picks a size', () => {
    expect(readingTextStyle(defaultReadingSettings, 22).fontSize).toBe('22px');
    expect(readingTextStyle({ ...defaultReadingSettings, textSize: 16 }, 22).fontSize).toBe('16px');
  });

  it('sets the dyslexia-friendly font in OpenDyslexic with extra letter spacing, and wide spacing a line height of 2', () => {
    const style = readingTextStyle(
      { ...defaultReadingSettings, font: 'dyslexia_friendly', lineSpacing: 'wide' },
      19,
    );
    expect(style.fontFamily).toBe('var(--font-dyslexia)');
    expect(style.letterSpacing).toBe('0.04em');
    expect(style.lineHeight).toBe(2);
  });

  it('sets the serif font in Literata, the story font', () => {
    const style = readingTextStyle({ ...defaultReadingSettings, font: 'serif' }, 19);
    expect(style.fontFamily).toBe('var(--font-story)');
  });

  it('keeps a size inside 14 to 28 px', () => {
    expect(clampTextSize(9)).toBe(14);
    expect(clampTextSize(31)).toBe(28);
  });

  it('keeps the 80 px column for comment markers beside each line width', () => {
    expect(readingColumnWidth('medium')).toBe(760);
    expect(readingColumnWidth('narrow')).toBe(640);
  });
});
