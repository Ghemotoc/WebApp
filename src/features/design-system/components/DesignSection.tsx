/**
 * DesignSection: one titled section of the /design page (story S1-E1-03).
 * Gives each section an id, so a section can be linked to (for example /design#ad-formats).
 * Who uses it: every section component in this folder.
 */
import type { ReactNode } from 'react';

/** What a section needs. */
export interface DesignSectionProps {
  id: string;
  title: string;
  children: ReactNode;
}

/**
 * Renders the section heading and its content.
 *
 * @returns the section
 */
export function DesignSection({ id, title, children }: DesignSectionProps) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="mt-14 flex flex-col gap-5">
      <h2 id={`${id}-heading`} className="m-0 text-[30px] font-bold tracking-[-0.01em]">
        {title}
      </h2>
      {children}
    </section>
  );
}
