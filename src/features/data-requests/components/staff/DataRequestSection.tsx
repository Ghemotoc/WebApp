/**
 * DataRequestSection: one titled panel on a data request's page (the request, the identity check,
 * more time, closing), so each part has its own heading for screen readers (bundle ADMIN-2, part
 * c1; story S1-E11-09).
 *
 * Who shows it: StaffDataRequestPage and its forms. Plain components, no doodles.
 */
import type { ReactNode } from 'react';

/** What the panel needs. */
interface DataRequestSectionProps {
  /** The heading's element ID, which also names the region. */
  id: string;
  heading: string;
  children: ReactNode;
}

/**
 * Renders the panel.
 *
 * @returns a labelled section with its heading and content
 */
export function DataRequestSection({ id, heading, children }: DataRequestSectionProps) {
  return (
    <section
      aria-labelledby={id}
      className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5"
    >
      <h2 id={id} className="m-0 font-heading text-[22px] font-bold text-heading">
        {heading}
      </h2>
      {children}
    </section>
  );
}
