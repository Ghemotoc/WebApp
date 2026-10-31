/**
 * MetricsCard: the white card every section of the staff Metrics page sits in (story S1-E11-04;
 * board AdminMetrics): an eyebrow, a heading, an optional line under it, then the content.
 *
 * The heading names the section for screen readers (aria-labelledby). Plain components, no
 * doodles (staff screens). Who uses it: AgeNumbersCards, TierNumbersTable, AnalyticsCards,
 * ComplianceLogSection and LaunchTaskCard.
 */
import type { ReactNode } from 'react';

/** What a card needs. */
interface MetricsCardProps {
  /** Unique on the page; links the heading to the section. */
  headingId: string;
  eyebrow: string;
  heading: string;
  intro?: string;
  /** Buttons beside the heading on wide screens, under it on phones. */
  actions?: ReactNode;
  children: ReactNode;
}

/**
 * Renders the card.
 *
 * @returns the section
 */
export function MetricsCard({
  headingId,
  eyebrow,
  heading,
  intro,
  actions,
  children,
}: MetricsCardProps) {
  return (
    <section
      aria-labelledby={headingId}
      className="flex min-w-0 flex-col gap-4 rounded-card border border-border bg-surface p-5 shadow-card"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="font-eyebrow text-sm text-eyebrow">{eyebrow}</span>
          <h2 id={headingId} className="m-0 font-heading text-[22px] font-bold text-heading">
            {heading}
          </h2>
          {intro !== undefined && <p className="m-0 max-w-[640px] text-sm text-body">{intro}</p>}
        </div>
        {actions !== undefined && <div className="flex flex-wrap gap-3">{actions}</div>}
      </div>
      {children}
    </section>
  );
}
