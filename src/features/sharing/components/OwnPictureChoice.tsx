/**
 * OwnPictureChoice: "Own picture" under the quote card's backgrounds (bundle GAPS-7, part c;
 * board 3.6 Share: "+ Your own picture" and "Your own picture goes through our image check
 * first, and you must have the right to use it").
 *
 * What it shows:
 * - once the reader's picture passed its check: an "Own picture" chip that puts it on the card;
 * - while it is checked, waits for a person or was removed: a line saying so, and no chip;
 * - always: the shared upload field (with the picture rules), to add or change the picture;
 * - when there is a picture: "Remove picture".
 * The picture is only ever the reader's own: nobody else sees it inside the app.
 * Who uses it: BackgroundPicker. What it calls: PictureUploadField and the hook it is given.
 */
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Notice } from '@/components/ui/Notice';
import { PictureUploadField } from '@/features/pictures/components/PictureUploadField';

import type { QuoteCardPicture } from '../hooks/useQuoteCardPicture';

/** What it needs. */
export interface OwnPictureChoiceProps {
  own: QuoteCardPicture;
  isChosen: boolean;
  onChoose: () => void;
}

/** The line for a picture that can't be used yet, by its state. */
const waitingLineKeys = {
  checking: 'quote.ownChecking',
  waiting_for_person: 'quote.ownWaiting',
  removed: 'quote.ownRemoved',
} as const;

/**
 * Renders the chip or the waiting line, the upload field and "Remove picture".
 *
 * @returns the section
 */
export function OwnPictureChoice({ own, isChosen, onChoose }: OwnPictureChoiceProps) {
  const { t } = useTranslation('sharing');
  const hasPicture = own.state !== null;
  return (
    <div className="flex flex-col gap-3">
      {own.state === 'visible' && (
        <div>
          {/* Pressing a pressed chip keeps it: one background is always chosen. */}
          <Chip isPressed={isChosen} isDisabled={own.bitmap === null} onPressedChange={onChoose}>
            {t('quote.own')}
          </Chip>
        </div>
      )}
      {own.state !== null && own.state !== 'visible' && (
        <p role="status" className="m-0 text-sm text-body">
          {t(waitingLineKeys[own.state])}
        </p>
      )}
      <PictureUploadField
        label={t(hasPicture ? 'quote.ownChange' : 'quote.ownUpload')}
        hint={t('quote.ownHint')}
        isUploading={own.isUploading}
        outcome={own.outcome}
        onPick={own.upload}
      />
      {hasPicture && (
        <Button
          variant="secondary"
          className="w-fit"
          disabled={own.isRemoving}
          onClick={() => own.remove()}
        >
          {t('quote.ownRemove')}
        </Button>
      )}
      <div aria-live="polite">
        {own.removeFailed && <Notice tone="error">{t('quote.ownRemoveFailed')}</Notice>}
      </div>
    </div>
  );
}
