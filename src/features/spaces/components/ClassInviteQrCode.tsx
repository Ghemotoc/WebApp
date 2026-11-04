/**
 * ClassInviteQrCode: the QR code for a class's joining link, drawn in the browser (bundle 14d
 * IDEAS-3, part b; idea IDEA-20261102-3).
 *
 * Black squares on white, whatever the theme, because scanners need dark on light. A student who
 * scans it lands on the "Join a class" page for that code (the link already holds it).
 * Who shows it: NewClassInviteCode (on screen) and ClassInviteSheet (on paper).
 * What it calls: qrModulesFor() and qrPathFor().
 */
import { useMemo } from 'react';

import { qrModulesFor, qrPathFor } from '../lib/qrModules';
import { useSpacesTranslation } from '../registerSpacesTranslations';

/** The white border round the code, in squares (the QR standard asks for 4). */
const QUIET_ZONE = 4;

/**
 * Renders the code.
 *
 * @param props.link - the joining link the code holds
 * @param props.className - size and spacing from the caller
 * @returns an SVG image named for screen readers
 */
export function ClassInviteQrCode({ link, className }: { link: string; className?: string }) {
  const { t } = useSpacesTranslation();
  // Working the code out takes a few milliseconds; do it once per link, not on every render.
  const drawing = useMemo(() => {
    const modules = qrModulesFor(link);
    return { size: modules.length + QUIET_ZONE * 2, path: qrPathFor(modules, QUIET_ZONE) };
  }, [link]);

  return (
    <svg
      role="img"
      aria-label={t('classInvite.qrLabel')}
      viewBox={`0 0 ${drawing.size} ${drawing.size}`}
      shapeRendering="crispEdges"
      data-testid="class-invite-qr"
      className={className}
    >
      <rect width={drawing.size} height={drawing.size} fill="#fff" />
      <path d={drawing.path} fill="#000" />
    </svg>
  );
}
