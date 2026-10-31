/**
 * StartAgeCheckButton: starts a new age check and opens Yoti's page (story S1-E2-08, part 08a).
 *
 * Who shows it: AgeCheckPage ("Continue with Yoti") and AgeCheckReturnPage ("Try again", "Start
 * again", "Use an ID document").
 * What it calls: api/ageCheck.ts → POST /api/age-check/start, then sends the browser to the page
 * the server answered (Yoti's hosted page, or the stand-in while there is no Yoti contract). A
 * start that fails says why in plain words, in a notice under the button.
 */
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { requireClient } from '@/features/account/hooks/useMyNames';

import { AgeCheckStartError, startAgeCheck } from '../api/ageCheck';

/** The button's text and look. */
interface StartAgeCheckButtonProps {
  label: string;
  variant?: 'primary' | 'secondary';
}

/**
 * Renders the button and, after a failed start, the reason.
 *
 * @param props.label - the button's text
 * @param props.variant - primary (the default) or secondary
 * @returns the button
 */
export function StartAgeCheckButton({ label, variant = 'primary' }: StartAgeCheckButtonProps) {
  const { t } = useTranslation('account');
  const start = useMutation({
    mutationFn: async () => startAgeCheck(await requireClient()),
    // The page to open comes from our server; the browser leaves for it straight away.
    onSuccess: (started) => window.location.assign(started.checkUrl),
  });
  // A start error names its reason; anything else reads as "unavailable".
  const failure = start.error instanceof AgeCheckStartError ? start.error.failure : 'unavailable';

  return (
    <div className="flex flex-col gap-3">
      <Button
        variant={variant}
        size="lg"
        className="self-start"
        disabled={start.isPending || start.isSuccess}
        onClick={() => start.mutate()}
      >
        {start.isPending || start.isSuccess ? t('ageCheck.starting') : label}
      </Button>
      {start.isError ? <Notice tone="error">{t(`ageCheck.errors.${failure}`)}</Notice> : null}
    </div>
  );
}
