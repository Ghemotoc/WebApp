/**
 * CertificateFrame: the look around a certificate's words: the coloured frame, the paper sheet,
 * the faint pattern behind the text and the seal at the top (bundle G13a; the canvas's Certificate
 * and SpaceCertificates boards).
 *
 * The words stay on near-white paper in dark ink, so the colour and pattern never touch their
 * contrast: the pattern is drawn at 8% opacity in the certificate colour, as the board does, and
 * the seal is the default cat in white on the colour. Everything here is decorative and hidden
 * from screen readers; the sheet's words say what the certificate is. When printed, the colours
 * are kept (print-color-adjust in src/styles/index.css), so the PDF looks like the screen.
 * Who shows it: CertificateSheet (the full A4 sheet) and CertificateLookPreview (the small one on
 * the teacher's page). What it calls: coverArtwork() for the pattern shapes and the look helpers.
 */
import type { ReactNode } from 'react';

import { coverArtwork } from '@/components/covers/coverDesigns';
import { defaultBrandPicture } from '@/features/branding/lib/brandDefaults';

import {
  certificateColourHex,
  certificateFrameBackground,
  type CertificateLook,
} from '../lib/certificateLook';

/**
 * The faint pattern, repeated over the whole sheet in the certificate colour.
 *
 * @param props.look - the certificate's look
 * @param props.patternId - a unique id for the SVG pattern on this page
 * @returns the SVG, or nothing for no pattern
 */
function PatternLayer({ look, patternId }: { look: CertificateLook; patternId: string }) {
  if (look.pattern === 'none') return null;
  const artwork = coverArtwork(look.pattern);
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      data-certificate-pattern={look.pattern}
      className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.08]"
      style={{ color: certificateColourHex[look.colour].light }}
    >
      <defs>
        {/* One cover-sized tile (100 × 160), repeated across the sheet. */}
        <pattern id={patternId} width="100" height="160" patternUnits="userSpaceOnUse">
          {artwork.fillPath !== '' && <path d={artwork.fillPath} fill="currentColor" />}
          {artwork.strokePath !== '' && (
            <path
              d={artwork.strokePath}
              fill="none"
              stroke="currentColor"
              strokeWidth={artwork.strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${patternId})`} />
    </svg>
  );
}

/**
 * The round seal: the curled cat in white on the certificate colour.
 *
 * @param props.look - the certificate's look
 * @param props.size - "large" on the sheet, "small" in the preview
 * @returns the seal, hidden from screen readers
 */
export function CertificateSeal({
  look,
  size,
}: {
  look: CertificateLook;
  size: 'large' | 'small';
}) {
  const { light, deep } = certificateColourHex[look.colour];
  const mask = `url(${defaultBrandPicture.emblem_light ?? ''})`;
  const sizeClasses = size === 'large' ? 'h-[84px] w-[84px]' : 'h-14 w-14';
  return (
    <span
      aria-hidden="true"
      data-certificate-seal="cat"
      className={`flex shrink-0 items-center justify-center rounded-full ${sizeClasses}`}
      style={{
        background: `radial-gradient(circle at 35% 30%, color-mix(in srgb, ${light} 70%, #FFFFFF), ${light} 45%, ${deep} 100%)`,
        boxShadow: `0 0 0 3px #FFFFFF, 0 0 0 4px color-mix(in srgb, ${light} 45%, #FFFFFF)`,
      }}
    >
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
    </span>
  );
}

/**
 * Renders the frame around a certificate's words.
 *
 * @param props.look - the certificate's look
 * @param props.patternId - a unique id for this sheet's pattern
 * @param props.isCompact - true for the small preview (less padding)
 * @param props.className - more classes, such as "certificate-sheet" for the page that prints
 * @param props.children - the sheet's words
 * @returns the frame
 */
export function CertificateFrame({
  look,
  patternId,
  isCompact = false,
  className = '',
  children,
}: {
  look: CertificateLook;
  patternId: string;
  isCompact?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      data-certificate-colour={look.colour}
      data-certificate-pattern-name={look.pattern}
      className={`certificate-frame relative overflow-hidden rounded-[26px] ${isCompact ? 'p-4' : 'p-4 sm:p-8'} ${className}`}
      style={{ background: certificateFrameBackground(look.colour) }}
    >
      <div className="certificate-paper relative overflow-hidden rounded-[18px] border border-white/95 bg-white/90 text-[#2A1E14] shadow-[inset_0_1px_0_#FFFFFF,0_20px_40px_-18px_rgba(0,0,0,0.5)]">
        <PatternLayer look={look} patternId={patternId} />
        <div className="relative">{children}</div>
      </div>
    </div>
  );
}
