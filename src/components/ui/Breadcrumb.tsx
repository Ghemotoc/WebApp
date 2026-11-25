/**
 * Breadcrumb: the small trail above a page's title, such as "Settings / Reports and decisions"
 * (user stories bundle 10, boards J04, J15 and J20 to J24: the account pages open with it instead
 * of an eyebrow and a back link).
 *
 * Every step but the last is a link, underlined and at least 24 px tall (CLAUDE.md rule 9). The
 * last step is the page itself: plain text marked aria-current="page". The slashes are drawn for
 * the eye only (aria-hidden), so a screen reader reads a list of steps.
 * Who shows it: the account pages (reports, support requests, moderator mail). What it calls:
 * React Router's Link.
 */
import { Link } from 'react-router';

/** One step of the trail: a linked step has an address, the current page has none. */
export interface BreadcrumbStep {
  /** The words, already translated. */
  label: string;
  /** Where the step leads; left out on the last step, the page itself. */
  to?: string;
}

/** What the trail needs. */
export interface BreadcrumbProps {
  /** The navigation's accessible name, already translated ("Where you are"). */
  label: string;
  /** The steps, from the top level down to the page itself. */
  steps: readonly BreadcrumbStep[];
}

/** A linked step: underlined, at least 24 px tall, with a larger tap area (hit-target). */
const stepLinkClassName =
  'hit-target inline-flex min-h-6 items-center text-link underline underline-offset-2';

/**
 * Renders one step, with the slash before it when it is not the first.
 *
 * @returns the list item
 */
function BreadcrumbItem({ step, isFirst }: { step: BreadcrumbStep; isFirst: boolean }) {
  return (
    <li className="flex min-w-0 items-center gap-2">
      {/* Step 1: the separator, for the eye only. */}
      {!isFirst && <span aria-hidden="true">/</span>}
      {/* Step 2: a link for a step above this page, plain marked text for the page itself. */}
      {step.to === undefined ? (
        <span aria-current="page" className="min-w-0 [overflow-wrap:anywhere]">
          {step.label}
        </span>
      ) : (
        <Link to={step.to} className={stepLinkClassName}>
          {step.label}
        </Link>
      )}
    </li>
  );
}

/**
 * Renders the trail.
 *
 * @param props.label - the navigation's accessible name
 * @param props.steps - the steps, top level first
 * @returns the breadcrumb navigation
 */
export function Breadcrumb({ label, steps }: BreadcrumbProps) {
  return (
    <nav aria-label={label}>
      <ol className="m-0 flex list-none flex-wrap items-center gap-2 p-0 type-meta text-ink-muted">
        {steps.map((step, index) => (
          <BreadcrumbItem key={`${index}-${step.label}`} step={step} isFirst={index === 0} />
        ))}
      </ol>
    </nav>
  );
}
