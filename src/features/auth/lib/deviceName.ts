/**
 * Names a signed-in device from its browser's user agent, for Settings › Signed-in devices
 * (story S1-E2-05; board 6.3: "We show the browser and the kind of device only").
 *
 * Who calls it: SignedInDevicesSection (src/features/account/components/).
 * Why so simple: only a recognisable name is needed ("Chrome on Windows"); nothing is stored or
 * sent anywhere. Unknown browsers or systems come back as null and the screen says "A browser".
 */

/** A device's browser and system, each null when not recognised. */
export interface DeviceName {
  browser: string | null;
  system: string | null;
}

/** Browsers to look for, in order: Edge and Opera also say "Chrome", so they come first. */
const browsers: [RegExp, string][] = [
  [/Edg\//, 'Edge'],
  [/OPR\/|Opera/, 'Opera'],
  [/Firefox\/|FxiOS/, 'Firefox'],
  [/SamsungBrowser/, 'Samsung Internet'],
  [/Chrome\/|CriOS/, 'Chrome'],
  [/Safari\//, 'Safari'],
];

/** Systems to look for, in order: iPhone and Android before the desktop names they contain. */
const systems: [RegExp, string][] = [
  [/iPhone/, 'iPhone'],
  [/iPad/, 'iPad'],
  [/Android/, 'Android'],
  [/Windows/, 'Windows'],
  [/Mac OS X|Macintosh/, 'Mac'],
  [/CrOS/, 'ChromeOS'],
  [/Linux/, 'Linux'],
];

/**
 * Finds the first name whose pattern matches.
 *
 * @param userAgent - the user agent text
 * @param candidates - patterns and names, in order
 * @returns the name, or null
 */
function firstMatch(userAgent: string, candidates: [RegExp, string][]): string | null {
  const found = candidates.find(([pattern]) => pattern.test(userAgent));
  return found === undefined ? null : found[1];
}

/**
 * Names a device.
 *
 * @param userAgent - the browser's user agent, as Supabase stored it (may be empty)
 * @returns the browser and the system
 */
export function describeDevice(userAgent: string | null): DeviceName {
  const text = userAgent ?? '';
  return { browser: firstMatch(text, browsers), system: firstMatch(text, systems) };
}
