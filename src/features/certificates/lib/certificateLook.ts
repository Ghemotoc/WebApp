/**
 * certificateLook: the colours and faint patterns a certificate can be drawn in (bundle G13a; the
 * canvas's SpaceCertificates and Certificate boards, "Certificate look").
 *
 * The teacher picks one colour and one pattern for a programme; the database saves both on each
 * certificate when it is signed (certificates.look_colour and look_pattern, which allow exactly
 * these names). The colour paints the frame around the sheet and the seal, and tints the pattern;
 * the pattern is one of the cover patterns, drawn very faintly behind the words so the text keeps
 * its contrast. The hex values are the board's, each a deep pair, so the white seal mark and the
 * dark text on the paper both read well.
 * Since G13b the seal shows either the Ghemotoc cat or the school's crest, in its own colours on a
 * white seal or in white on the certificate colour.
 * Who calls it: CertificateSheet, CertificateLookPicker and the API readers in api/. What it
 * calls: nothing.
 */

/** The eight certificate colours, in the board's order. */
export const certificateColours = [
  'plum',
  'ember',
  'sea_glass',
  'pistachio',
  'candy',
  'crimson',
  'cobalt',
  'autumn',
] as const;

/** One certificate colour. */
export type CertificateColour = (typeof certificateColours)[number];

/** The patterns behind the text: none, then the cover patterns the board offers. */
export const certificatePatterns = [
  'none',
  'stripes',
  'dots',
  'grid',
  'waves',
  'starry',
  'arches',
  'rings',
  'forestwaves',
] as const;

/** One certificate pattern. */
export type CertificatePattern = (typeof certificatePatterns)[number];

/** What the seal shows: the Ghemotoc cat or the school's crest (G13b). */
export const certificateSeals = ['cat', 'crest'] as const;

/** One seal. */
export type CertificateSeal = (typeof certificateSeals)[number];

/** How a crest is drawn: in its own colours on a white seal, or in white on the colour (G13b). */
export const crestColourChoices = ['own', 'white'] as const;

/** One way of drawing the crest. */
export type CrestColours = (typeof crestColourChoices)[number];

/** A certificate's look, as saved at signing. */
export interface CertificateLook {
  colour: CertificateColour;
  pattern: CertificatePattern;
  seal: CertificateSeal;
  crestColours: CrestColours;
}

/** The look a certificate has when nobody chose one: Plum, no pattern and the cat on its seal. */
export const defaultCertificateLook: CertificateLook = {
  colour: 'plum',
  pattern: 'none',
  seal: 'cat',
  crestColours: 'own',
};

/** Each colour's light and deep end, from the board (the frame is a gradient between them). */
export const certificateColourHex: Record<CertificateColour, { light: string; deep: string }> = {
  plum: { light: '#672786', deep: '#2A0E33' },
  ember: { light: '#C2412D', deep: '#6B1D12' },
  sea_glass: { light: '#0F766E', deep: '#0B3D3A' },
  pistachio: { light: '#4D7C0F', deep: '#1F3A0A' },
  candy: { light: '#C0266D', deep: '#5A0B2E' },
  crimson: { light: '#9F1239', deep: '#3B0A16' },
  cobalt: { light: '#1D4ED8', deep: '#172554' },
  autumn: { light: '#9A3412', deep: '#431407' },
};

/**
 * Reads a colour the database sent, keeping the default for anything unknown.
 *
 * @param value - the look_colour field
 * @returns a known colour
 */
export function certificateColourOf(value: unknown): CertificateColour {
  return certificateColours.find((colour) => colour === value) ?? defaultCertificateLook.colour;
}

/**
 * Reads a pattern the database sent, keeping no pattern for anything unknown.
 *
 * @param value - the look_pattern field
 * @returns a known pattern
 */
export function certificatePatternOf(value: unknown): CertificatePattern {
  return certificatePatterns.find((pattern) => pattern === value) ?? defaultCertificateLook.pattern;
}

/**
 * Reads a seal the database sent, keeping the cat for anything unknown.
 *
 * @param value - the look_seal field
 * @returns a known seal
 */
export function certificateSealOf(value: unknown): CertificateSeal {
  return certificateSeals.find((seal) => seal === value) ?? defaultCertificateLook.seal;
}

/**
 * Reads the crest colours the database sent, keeping "own" for anything unknown.
 *
 * @param value - the look_crest_colours field
 * @returns a known choice
 */
export function crestColoursOf(value: unknown): CrestColours {
  return (
    crestColourChoices.find((choice) => choice === value) ?? defaultCertificateLook.crestColours
  );
}

/**
 * The look as issue_class_certificates() takes it.
 *
 * @param look - the teacher's choice
 * @returns the JSON object the database reads
 */
export function certificateLookJson(look: CertificateLook): {
  colour: string;
  pattern: string;
  seal: string;
  crest_colours: string;
} {
  return {
    colour: look.colour,
    pattern: look.pattern,
    seal: look.seal,
    crest_colours: look.crestColours,
  };
}

/**
 * The frame's background: the colour's gradient, as the board draws it.
 *
 * @param colour - the certificate colour
 * @returns a CSS background value
 */
export function certificateFrameBackground(colour: CertificateColour): string {
  const { light, deep } = certificateColourHex[colour];
  return `linear-gradient(135deg, ${light}, ${deep} 72%)`;
}
