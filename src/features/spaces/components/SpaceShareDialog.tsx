/**
 * SpaceShareDialog: "Share this space" (bundle GAPS-10; design/boards/Space.dc.html: the "Share"
 * button; the dialog follows board 3.6 Share).
 *
 * The link in a read-only field with "Copy link", a QR code of the same link for a poster or a
 * phone held up in a room, and, on a device with its own share menu, "Share with an app". The
 * code is drawn in the browser; nothing is stored or counted (rule 7).
 * Who uses it: SpaceShareButton. What it calls: the sharing feature's SharingModal and
 * ShareLinkRow, lib/qrModules.ts for the code and lib/systemShare.ts for the share menu.
 */
import { useMemo } from 'react';

import { Button } from '@/components/ui/Button';
import { ShareLinkRow } from '@/features/sharing/components/ShareLinkRow';
import { SharingModal } from '@/features/sharing/components/SharingModal';
import { shareWithSystem } from '@/features/sharing/lib/systemShare';

import { qrModulesFor, qrPathFor } from '../lib/qrModules';
import { useSpacesTranslation } from '../registerSpacesTranslations';

/** The white border round the code, in squares (the QR standard asks for 4). */
const QUIET_ZONE = 4;

/** What the dialog needs. */
export interface SpaceShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** The space's name, for the heading's second line and the share menu. */
  name: string;
  link: string;
}

/**
 * The QR code of the link, black on white whatever the theme (scanners need dark on light).
 *
 * @param props.link - the link the code holds
 * @returns the code as an image named for screen readers, with a line saying what it is for
 */
function SpaceQrCode({ link }: { link: string }) {
  const { t } = useSpacesTranslation();
  // Working the code out takes a few milliseconds; do it once per link.
  const drawing = useMemo(() => {
    const modules = qrModulesFor(link);
    return { size: modules.length + QUIET_ZONE * 2, path: qrPathFor(modules, QUIET_ZONE) };
  }, [link]);
  return (
    <div className="flex flex-col gap-2">
      <h3 className="m-0 eyebrow">{t('share.qrHeading')}</h3>
      <div className="flex flex-wrap items-center gap-4">
        <svg
          role="img"
          aria-label={t('share.qrLabel')}
          viewBox={`0 0 ${drawing.size} ${drawing.size}`}
          shapeRendering="crispEdges"
          data-testid="space-share-qr"
          className="size-40 flex-none rounded-xl"
        >
          <rect width={drawing.size} height={drawing.size} fill="#fff" />
          <path d={drawing.path} fill="#000" />
        </svg>
        <p className="m-0 min-w-0 flex-1 basis-48 text-sm text-body">{t('share.qrNote')}</p>
      </div>
    </div>
  );
}

/**
 * "Share with an app", only where the browser has a share menu.
 *
 * @returns the button, or nothing on a browser without navigator.share
 */
function SystemShareButton({ name, link }: { name: string; link: string }) {
  const { t } = useSpacesTranslation();
  if (typeof navigator.share !== 'function') return null;

  /** Opens the device's share menu; a failure leaves the link and the code to use instead. */
  async function share() {
    try {
      await shareWithSystem(name, link);
    } catch (error) {
      console.warn('The system share sheet failed.', error);
    }
  }

  return (
    <Button variant="secondary" onClick={() => void share()}>
      {t('share.withApp')}
    </Button>
  );
}

/**
 * Renders the dialog.
 *
 * @returns the dialog
 */
export function SpaceShareDialog({ isOpen, onClose, name, link }: SpaceShareDialogProps) {
  const { t } = useSpacesTranslation();
  return (
    <SharingModal
      isOpen={isOpen}
      onClose={onClose}
      title={t('share.title')}
      description={name}
      closeLabel={t('share.close')}
    >
      <ShareLinkRow link={link} wasCopied={null} />
      <SpaceQrCode link={link} />
      <p className="m-0 text-sm text-body">{t('share.privacy')}</p>
      <div className="flex flex-wrap justify-end gap-3 border-t border-border pt-4">
        <SystemShareButton name={name} link={link} />
        <Button onClick={onClose}>{t('share.done')}</Button>
      </div>
    </SharingModal>
  );
}
