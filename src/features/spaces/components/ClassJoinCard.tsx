/**
 * ClassJoinCard: the one glass card the class pages sit in (bundle G8e; boards ClassJoin and
 * ClassInvite, story S1-E8-11).
 *
 * Board values: a centred box up to 640 px wide with 28 px corners and the page title inside it
 * (no eyebrow since CALM-9f, boards G01 and G02), then whatever the page puts below. The title is the page's h1, so a
 * screen reader user lands on what the card is about.
 * Who uses it: JoinClassPage, for "Join a class" (the code form) and for a class invite link.
 */
import type { ReactNode } from 'react';

/** What the card needs. */
interface ClassJoinCardProps {
  /** The page title: "Join a class", or the class's name once a code is known to work. */
  title: string;
  children: ReactNode;
}

/**
 * Renders the card.
 *
 * @param props - the title and the card's body
 * @returns the section, labelled by its title
 */
export function ClassJoinCard({ title, children }: ClassJoinCardProps) {
  return (
    <section
      aria-labelledby="class-join-heading"
      className="mx-auto flex w-full max-w-[640px] flex-col gap-5 rounded-[28px] border border-border bg-surface p-6 shadow-card md:p-8"
    >
      <div className="flex flex-col gap-2">
        <h1 id="class-join-heading" className="m-0 type-title break-words lg:type-display">
          {title}
        </h1>
      </div>
      {children}
    </section>
  );
}
