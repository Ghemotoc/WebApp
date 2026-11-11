/**
 * CertificateSeal: the round seal at the top of a certificate (bundle G13a, with the school's crest
 * since G13b; the canvas's Certificate and SpaceCertificates boards, "In the seal").
 *
 * The seal shows one of two marks:
 * - the curled cat, in white on the certificate colour (the default, and every contest certificate);
 * - the school's crest, once its picture check passed (CLAUDE.md rule 19). In its own colours it
 *   sits on a plain white seal; in white it is drawn as a white shape on the certificate colour.
 * A crest seal whose picture isn't visible yet (still being checked, waiting for a moderator or
 * taken down) shows the cat instead, as the board says ("until then, the cat shows").
 * The seal is decorative and hidden from screen readers; the sheet's words say what it is.
 * Who shows it: CertificateSheet and CertificateLookPicker's preview. What it calls: the look
 * helpers and the brand's default emblem.
 */
import type { CSSProperties } from 'react';

import { defaultBrandPicture } from '@/features/branding/lib/brandDefaults';

import { certificateColourHex, type CertificateLook } from '../lib/certificateLook';

/** What the seal needs. */
interface CertificateSealProps {
  look: CertificateLook;
  /** "large" on the sheet, "small" in the preview. */
  size: 'large' | 'small';
  /** The crest's signed address, or null when there is none the caller may see. */
  crestUrl?: string | null;
}

/**
 * The coloured disc behind a white mark: the certificate colour, lit from the top left.
 *
 * @param look - the certificate's look
 * @returns the disc's styles
 */
function colouredDisc(look: CertificateLook): CSSProperties {
  const { light, deep } = certificateColourHex[look.colour];
  return {
    background: `radial-gradient(circle at 35% 30%, color-mix(in srgb, ${light} 70%, #FFFFFF), ${light} 45%, ${deep} 100%)`,
    boxShadow: `0 0 0 3px #FFFFFF, 0 0 0 4px color-mix(in srgb, ${light} 45%, #FFFFFF)`,
  };
}

/**
 * The plain white disc a crest in its own colours sits on, with the board's soft edge.
 *
 * @returns the disc's styles
 */
function whiteDisc(): CSSProperties {
  return {
    background: '#FFFFFF',
    boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.08), 0 6px 14px rgba(0, 0, 0, 0.18)',
  };
}

/**
 * The curled cat, cut out of white by the brand's emblem.
 *
 * @returns the mark
 */
function CatMark() {
  const mask = `url(${defaultBrandPicture.emblem_light ?? ''})`;
  return (
    <span
      className="block h-[55%] w-[55%] bg-white"
      style={{
        maskImage: mask,
        WebkitMaskImage: mask,
        maskSize: 'contain',
        WebkitMaskSize: 'contain',
        maskRepeat: 'no-repeat',
        WebkitMaskRepeat: 'no-repeat',
        maskPosition: 'center',
        WebkitMaskPosition: 'center',
      }}
    />
  );
}

/**
 * The school's crest: as uploaded, or turned into a white shape on the colour.
 *
 * @param props.url - the crest's signed address
 * @param props.isWhite - true for "White on the certificate colour"
 * @returns the mark
 */
function CrestMark({ url, isWhite }: { url: string; isWhite: boolean }) {
  return (
    <img
      src={url}
      alt=""
      className="block h-[62%] w-[62%] object-contain"
      // brightness(0) makes every pixel black, invert(1) then makes it white; the crest's
      // transparent parts stay transparent, so its outline shows in white.
      style={isWhite ? { filter: 'brightness(0) invert(1)' } : undefined}
    />
  );
}

/**
 * Renders the seal.
 *
 * @returns the seal, hidden from screen readers
 */
export function CertificateSeal({ look, size, crestUrl = null }: CertificateSealProps) {
  // Step 1: the crest shows only when the look asks for it and its file may be read.
  const showsCrest = look.seal === 'crest' && crestUrl !== null;
  const isWhiteCrest = showsCrest && look.crestColours === 'white';
  // Step 2: a crest in its own colours sits on white; the cat and a white crest sit on the colour.
  const disc = showsCrest && !isWhiteCrest ? whiteDisc() : colouredDisc(look);
  const sizeClasses = size === 'large' ? 'h-[84px] w-[84px]' : 'h-14 w-14';
  return (
    <span
      aria-hidden="true"
      data-certificate-seal={showsCrest ? 'crest' : 'cat'}
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full ${sizeClasses}`}
      style={disc}
    >
      {showsCrest ? <CrestMark url={crestUrl} isWhite={isWhiteCrest} /> : <CatMark />}
    </span>
  );
}
