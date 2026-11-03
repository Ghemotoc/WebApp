/**
 * PictureDecisionButtons: the three decisions for one waiting picture (bundle ADMIN-2, part e1b;
 * Robert's brief of 2 Nov 2026, section 3).
 *
 * - Green, Approve: the picture shows at once wherever it was used.
 * - Yellow, Approve and raise the rating: asks what the picture shows and raises the story to 16+
 *   or 18+ first (only offered where the rules allow it, lib/pictureRaiseOptions.ts).
 * - Red, Reject: asks what the picture shows (RejectPictureForm) and removes it.
 * Each button has an icon and a word as well as its colour, and every control works by keyboard
 * (WCAG 2.2 AA, 1.4.1: colour is never the only signal). Plain components, no doodles (staff).
 * Who shows it: PictureToCheckCard. What it calls: the decide() it is given (usePicturesToCheck).
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { ArrowRightIcon } from '@/components/icons/ArrowRightIcon';
import { CheckIcon } from '@/components/icons/CheckIcon';
import { CrossIcon } from '@/components/icons/CrossIcon';

import type { PictureDecision, PictureToCheck } from '../api/picturesToCheck';
import { raiseOptionsFor } from '../lib/pictureRaiseOptions';

import { RaiseRatingForm } from './RaiseRatingForm';
import { RejectPictureForm } from './RejectPictureForm';

/** What the card is showing under the buttons. */
type OpenForm = 'none' | 'raise' | 'reject';

/** The green and yellow classes: the pill colours, readable in light and night mode. */
const approveClasses =
  'border border-(--pill-sage-border) bg-(--pill-sage-bg) text-(--pill-sage-text)';
const raiseClasses =
  'border border-(--pill-gold-border) bg-(--pill-gold-bg) text-(--pill-gold-text)';

/** What the buttons need. */
export interface PictureDecisionButtonsProps {
  picture: PictureToCheck;
  reasons: string[];
  isDeciding: boolean;
  onDecide: (decision: PictureDecision) => void;
}

/** What the row of three buttons needs. */
interface ButtonRowProps {
  isDeciding: boolean;
  canRaise: boolean;
  openForm: OpenForm;
  onApprove: () => void;
  onToggle: (form: OpenForm) => void;
}

/**
 * The green, yellow and red buttons. Yellow and red open their form and say so (aria-expanded).
 *
 * @returns the row of buttons
 */
function ButtonRow(props: ButtonRowProps) {
  const { t } = useTranslation('moderation');
  const toggle = (form: OpenForm) => props.onToggle(props.openForm === form ? 'none' : form);
  return (
    <div className="flex flex-wrap gap-3">
      <Button
        className={approveClasses}
        variant="secondary"
        disabled={props.isDeciding}
        onClick={props.onApprove}
      >
        <CheckIcon />
        {t('pictures.approve')}
      </Button>
      {props.canRaise && (
        <Button
          className={raiseClasses}
          variant="secondary"
          disabled={props.isDeciding}
          aria-expanded={props.openForm === 'raise'}
          onClick={() => toggle('raise')}
        >
          <ArrowRightIcon className="-rotate-90" />
          {t('pictures.raise')}
        </Button>
      )}
      <Button
        variant="destructive"
        disabled={props.isDeciding}
        aria-expanded={props.openForm === 'reject'}
        onClick={() => toggle('reject')}
      >
        <CrossIcon />
        {t('pictures.reject')}
      </Button>
    </div>
  );
}

/**
 * Renders the buttons and, when asked, the yellow or red form.
 *
 * @returns the decision area of one card
 */
export function PictureDecisionButtons(props: PictureDecisionButtonsProps) {
  const { t } = useTranslation('moderation');
  const { picture, isDeciding, onDecide } = props;
  const [openForm, setOpenForm] = useState<OpenForm>('none');
  const raiseOptions = raiseOptionsFor(picture);
  const approve = () =>
    onDecide({
      kind: 'approve',
      caseId: picture.caseId,
      note: t('pictures.approveNote'),
      newRating: null,
    });
  const close = () => setOpenForm('none');
  return (
    <div className="flex flex-col gap-4">
      <ButtonRow
        isDeciding={isDeciding}
        canRaise={raiseOptions.length > 0}
        openForm={openForm}
        onApprove={approve}
        onToggle={setOpenForm}
      />
      {openForm === 'raise' && (
        <RaiseRatingForm
          picture={picture}
          options={raiseOptions}
          isDeciding={isDeciding}
          onDecide={onDecide}
          onCancel={close}
        />
      )}
      {openForm === 'reject' && (
        <RejectPictureForm
          picture={picture}
          reasons={props.reasons}
          isDeciding={isDeciding}
          onDecide={onDecide}
          onCancel={close}
        />
      )}
    </div>
  );
}
