/**
 * LegalQuestions: the side column's "Questions or a report?" (board J08 of the user stories,
 * bundle 10), under the version history on every legal document.
 *
 * Three lines, each with an underlined link: Contact us for a question or an account problem
 * (S1-E14-04), the public report form anyone can use (S1-E10-02), and the removal-order form for
 * authorities (S1-E10-09; the TCO Regulation's contact point). These links sat only under the
 * Contact document before bundle 10; the board puts them beside every document.
 * Who uses it: LegalDocumentView. What it calls: React Router's Link.
 */
import { Trans, useTranslation } from 'react-i18next';
import { Link } from 'react-router';

/** The look of every link here: the link colour, underlined. */
const linkClassName = 'text-link underline';

/**
 * Renders the block.
 *
 * @returns a section with its heading and three lines
 */
export function LegalQuestions() {
  const { t } = useTranslation('legal');
  return (
    <section aria-labelledby="legal-questions" className="flex flex-col gap-2">
      <h3
        id="legal-questions"
        className="m-0 font-heading type-subheading font-bold text-ink-heading"
      >
        {t('questions.heading')}
      </h3>
      {/* Step 1: a question or an account problem goes to Contact us. */}
      <p className="m-0 type-body">
        {t('contactUs.text')}{' '}
        <Link to="/contact" className={linkClassName}>
          {t('contactUs.link')}
        </Link>
      </p>
      {/* Step 2: illegal content goes to the public report form. */}
      <p className="m-0 type-body">
        <Trans
          t={t}
          i18nKey="questions.report"
          components={{ report: <Link to="/report" className={linkClassName} /> }}
        />
      </p>
      {/* Step 3: authorities send removal orders through the same form's own path. */}
      <p className="m-0 type-body">
        <Link to="/report?kind=removal_order" className={linkClassName}>
          {t('reportForm.orderLink')}
        </Link>
      </p>
    </section>
  );
}
