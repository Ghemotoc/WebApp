/**
 * AgeCheckStartPanel: the two methods, what we keep and "Continue with Yoti" (story S1-E2-08,
 * part 08a; board AgeCheck.dc.html, "Choose how to check").
 *
 * Who shows it: AgeCheckPage, when a check can start. What it calls: StartAgeCheckButton.
 * Both methods are offered on Yoti's own page (criterion 2), so this panel explains them rather
 * than asking for a choice here (board mismatch noted in the pull request).
 */
import { useTranslation } from 'react-i18next';

import { StartAgeCheckButton } from './StartAgeCheckButton';

/**
 * One method's card.
 *
 * @param props.title - the method's name, with an optional note beside it
 * @param props.body - one line on how it works
 * @returns the card
 */
function MethodCard({ title, note, body }: { title: string; note?: string; body: string }) {
  return (
    <li className="flex flex-col gap-1 rounded-2xl border border-border bg-surface p-4">
      <p className="m-0 font-semibold text-heading">
        {title} {note === undefined ? null : <span className="font-normal text-meta">{note}</span>}
      </p>
      <p className="m-0 text-sm text-body">{body}</p>
    </li>
  );
}

/**
 * Renders the panel.
 *
 * @returns the methods, the start button and the "What we keep" line
 */
export function AgeCheckStartPanel() {
  const { t } = useTranslation('account');
  return (
    <div className="flex flex-col gap-5">
      <section aria-labelledby="age-check-methods-heading" className="flex flex-col gap-3">
        <h2
          id="age-check-methods-heading"
          className="m-0 font-heading text-[20px] font-bold text-heading"
        >
          {t('ageCheck.methodsHeading')}
        </h2>
        <p className="m-0 text-body">{t('ageCheck.methodsIntro')}</p>
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          <MethodCard
            title={t('ageCheck.selfieTitle')}
            note={t('ageCheck.selfieNote')}
            body={t('ageCheck.selfieBody')}
          />
          <MethodCard title={t('ageCheck.documentTitleMethod')} body={t('ageCheck.documentBody')} />
        </ul>
      </section>
      <div className="flex flex-col gap-2">
        <StartAgeCheckButton label={t('ageCheck.start')} />
        <p className="m-0 text-sm text-meta">{t('ageCheck.startHint')}</p>
      </div>
      {/* Criterion 5 and CLAUDE.md rule 5: only the result, its date and its method are kept. */}
      <p className="m-0 rounded-2xl bg-tint p-4 text-sm text-body">
        <strong className="text-heading">{t('ageCheck.keptLabel')}</strong> {t('ageCheck.keptBody')}
      </p>
    </div>
  );
}
