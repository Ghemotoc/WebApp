/**
 * ClassJoinCard: the one glass card the class pages sit in (bundle G8e; boards ClassJoin and
 * ClassInvite, story S1-E8-11).
 *
 * Board values: a centred glass card up to 640 px wide with 28 px corners, the eyebrow and the
 * page title inside it, then whatever the page puts below. The title is the page's h1, so a
 * screen reader user lands on what the card is about.
 * Who uses it: JoinClassPage, for "Join a class" (the code form) and for a class invite link.
 */
import type { ReactNode } from 'react';

import { Eyebrow } from '@/components/ui/Eyebrow';

/** What the card needs. */
interface ClassJoinCardProps {
  eyebrow: string;
  /** The page title: "Join a class", or the class's name once a code is known to work. */
  title: string;
  children: ReactNode;
}

/**
 * Renders the card.
 *
 * @param props - the eyebrow, the title and the card's body
 * @returns the section, labelled by its title
 */
export function ClassJoinCard({ eyebrow, title, children }: ClassJoinCardProps) {
  return (
    <section
      aria-labelledby="class-join-heading"
      className="mx-auto flex w-full max-w-[640px] flex-col gap-5 rounded-[28px] border border-border bg-surface p-6 shadow-card md:p-8"
    >
      <div className="flex flex-col gap-2">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1
          id="class-join-heading"
          className="m-0 font-heading text-[32px] leading-tight font-bold break-words text-heading md:text-[40px]"
        >
          {title}
        </h1>
      </div>
      {children}
    </section>
  );
}
