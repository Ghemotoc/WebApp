/**
 * SettingsSection: one titled block of Staff › Settings, a landmark region named by its heading
 * (story S1-E11-03). Plain components, no doodles (staff screens).
 *
 * Who uses it: every section of SettingsPage.
 */
import type { ReactNode } from 'react';

/** What a section needs. */
interface SettingsSectionProps {
  /** The id the page's "On this page" links jump to. */
  id: string;
  heading: string;
  intro: string;
  children: ReactNode;
}

/**
 * Renders the section.
 *
 * @returns the section with its heading, intro and content
 */
export function SettingsSection({ id, heading, intro, children }: SettingsSectionProps) {
  const headingId = `${id}-heading`;
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className="flex scroll-mt-24 flex-col gap-4 rounded-card border border-border bg-surface p-5 sm:p-6"
    >
      <div className="flex flex-col gap-1">
        <h2 id={headingId} className="m-0 font-heading text-[22px] font-bold text-heading">
          {heading}
        </h2>
        <p className="m-0 max-w-[720px] text-sm text-body">{intro}</p>
      </div>
      {children}
    </section>
  );
}
