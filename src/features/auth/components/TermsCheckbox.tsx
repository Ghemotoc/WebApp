/**
 * TermsCheckbox: "I agree to the Terms and I've read the Privacy notice", board 2.1 (stories
 * S1-E2-01 and S1-E14-01: the Legal centre is linked from sign-up).
 *
 * Consent is the legal basis (Q15), so the box is never ticked for the person. The links open the
 * Legal centre in a new tab, so nothing typed in the form is lost, and say so to screen readers.
 * The sign-up records which versions were shown, with the time (the sign-up trigger).
 * Who uses it: SignUpForm.
 */
import { useTranslation } from 'react-i18next';

/** What the box needs. */
interface TermsCheckboxProps {
  isChecked: boolean;
  problem?: string;
  onChange: (isChecked: boolean) => void;
}

/**
 * One link to a legal document, opening in a new tab.
 *
 * @returns the link
 */
function LegalLink({ slug, text }: { slug: string; text: string }) {
  const { t } = useTranslation('auth');
  return (
    <a
      href={`/legal/${slug}`}
      target="_blank"
      rel="noopener"
      className="text-link underline hover:text-link-hover"
    >
      {text}
      <span className="sr-only"> {t('signUp.terms.newTab')}</span>
    </a>
  );
}

/**
 * Renders the box and its label.
 *
 * @returns the checkbox row and its error
 */
export function TermsCheckbox({ isChecked, problem, onChange }: TermsCheckboxProps) {
  const { t } = useTranslation('auth');
  const errorId = problem === undefined ? undefined : 'sign-up-terms-error';
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-start gap-3">
        <input
          id="sign-up-terms"
          type="checkbox"
          checked={isChecked}
          aria-describedby={errorId}
          aria-invalid={problem === undefined ? undefined : true}
          onChange={(event) => onChange(event.target.checked)}
          className="mt-0.5 size-6 shrink-0 cursor-pointer accent-(--link)"
        />
        <label htmlFor="sign-up-terms" className="text-[15px] text-body">
          {t('signUp.terms.before')} <LegalLink slug="terms" text={t('signUp.terms.termsLink')} />{' '}
          {t('signUp.terms.middle')}{' '}
          <LegalLink slug="privacy" text={t('signUp.terms.privacyLink')} />
          {t('signUp.terms.after')}
        </label>
      </div>
      {problem !== undefined && (
        <p id={errorId} className="m-0 text-sm text-destructive">
          {t(problem)}
        </p>
      )}
    </div>
  );
}
