/**
 * Colour contrast maths from WCAG 2.2 (story S1-E1-03).
 *
 * Who calls it: scripts/token-contrast.test.ts (the CI check on every token pair) and the colours
 * section of the /design page, which shows each pair's ratio.
 * Source: WCAG 2.2, "contrast ratio" and "relative luminance" definitions.
 */

/**
 * Turns the short #rgb form into #rrggbb; any other text comes back unchanged.
 * The build shortens colours in the CSS (#ffffff becomes #fff), and the /design page reads
 * colours back from that CSS.
 *
 * @param colour - a colour such as '#fff' or '#faf8f5'
 * @returns the six-digit form, for example '#ffffff'
 */
function expandShortHex(colour: string): string {
  const shortForm = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(colour);
  if (shortForm === null) return colour;
  const [, red = '', green = '', blue = ''] = shortForm;
  return `#${red}${red}${green}${green}${blue}${blue}`;
}

/**
 * Reads a #rrggbb or #rgb colour into red, green and blue from 0 to 255.
 *
 * @param hexColour - for example '#FAF8F5' or '#fff' (upper or lower case)
 * @returns the three channel values
 * Errors: throws when the text is not a hex colour, naming the value.
 */
export function hexToRgb(hexColour: string): [number, number, number] {
  const fullColour = expandShortHex(hexColour.trim());
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(fullColour);
  if (match === null) {
    throw new Error(`"${hexColour}" is not a #rrggbb colour.`);
  }
  return [
    parseInt(match[1] ?? '0', 16),
    parseInt(match[2] ?? '0', 16),
    parseInt(match[3] ?? '0', 16),
  ];
}

/**
 * How bright a colour looks to the eye, from 0 (black) to 1 (white), as WCAG defines it.
 *
 * @param hexColour - a #rrggbb colour
 * @returns the relative luminance
 */
export function relativeLuminance(hexColour: string): number {
  // Turn each channel into a linear light value (undoing the sRGB curve).
  const [red, green, blue] = hexToRgb(hexColour).map((channel) => {
    const fraction = channel / 255;
    return fraction <= 0.03928 ? fraction / 12.92 : ((fraction + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];

  // Green counts most and blue least, matching how eyes see brightness.
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

/**
 * The contrast ratio between two colours, from 1 (identical) to 21 (black on white).
 * WCAG 2.2 AA asks for at least 4.5 for text, 3 for large text and for interface parts.
 *
 * @param firstColour - a #rrggbb colour
 * @param secondColour - another #rrggbb colour (order doesn't matter)
 * @returns the ratio, for example 5.94
 */
export function contrastRatio(firstColour: string, secondColour: string): number {
  const lighter = Math.max(relativeLuminance(firstColour), relativeLuminance(secondColour));
  const darker = Math.min(relativeLuminance(firstColour), relativeLuminance(secondColour));
  return (lighter + 0.05) / (darker + 0.05);
}
