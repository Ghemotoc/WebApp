/**
 * SpaceShareButton: "Share" in a space's header (bundle GAPS-10; design/boards/Space.dc.html).
 *
 * It opens "Share this space": the link, "Copy link", a QR code and the device's share menu
 * where there is one. A class space has no Share: students join with the teacher's code, never
 * from a link passed around (S1-E8-11).
 * Who uses it: SpaceHeaderCard. What it calls: SpaceShareDialog and lib/spaceShareLink.ts. The
 * dialog reuses the sharing feature's link row, so its texts are registered here.
 */
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { registerSharingTranslations } from '@/features/sharing/registerSharingTranslations';

import type { Space } from '../api/spaces';
import { spaceShareLink } from '../lib/spaceShareLink';
import { useSpacesTranslation } from '../registerSpacesTranslations';

import { SpaceShareDialog } from './SpaceShareDialog';

/**
 * Renders the button and, once pressed, the dialog.
 *
 * @param props.space - the space
 * @returns the button and dialog, or nothing for a class space
 */
export function SpaceShareButton({ space }: { space: Space }) {
  const { t } = useSpacesTranslation();
  const { i18n } = useTranslation();
  registerSharingTranslations(i18n);
  const [isOpen, setIsOpen] = useState(false);
  // Classes are joined with a code from the teacher, so they are never shared by link.
  if (space.kind === 'class') return null;
  return (
    <>
      <Button
        variant="secondary"
        aria-haspopup="dialog"
        aria-label={t('share.buttonLabel', { name: space.name })}
        onClick={() => setIsOpen(true)}
      >
        {t('share.button')}
      </Button>
      {/* The button sits on the banner, which recolours every text token for itself. The dialog
          is drawn at the end of <body> instead, so it keeps the page's own colours. */}
      {isOpen &&
        createPortal(
          <SpaceShareDialog
            isOpen
            onClose={() => setIsOpen(false)}
            name={space.name}
            link={spaceShareLink(space.slug)}
          />,
          document.body,
        )}
    </>
  );
}
