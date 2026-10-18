/** Tests for naming a signed-in device (story S1-E2-05). */
import { describe, expect, it } from 'vitest';

import { describeDevice } from './deviceName';

describe('naming a device from its user agent', () => {
  it('names Chrome on Windows', () => {
    expect(
      describeDevice(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36',
      ),
    ).toEqual({ browser: 'Chrome', system: 'Windows' });
  });

  it('names Safari on an iPhone, not on a Mac', () => {
    expect(
      describeDevice(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
      ),
    ).toEqual({ browser: 'Safari', system: 'iPhone' });
  });

  it('names Edge, which also says Chrome', () => {
    expect(
      describeDevice('Mozilla/5.0 (Macintosh) Chrome/130.0 Safari/537.36 Edg/130.0').browser,
    ).toBe('Edge');
  });

  it('answers null for an unknown or missing user agent', () => {
    expect(describeDevice(null)).toEqual({ browser: null, system: null });
    expect(describeDevice('curl/8.0')).toEqual({ browser: null, system: null });
  });
});
