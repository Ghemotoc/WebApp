/**
 * Small shared helpers for styling (story S1-E1-01).
 *
 * Who calls it: shadcn/ui components (added with `npx shadcn add <component>`, which expects this
 * file at @/lib/utils) and any component that builds a className from conditions.
 * What it calls: clsx (joins class names) and tailwind-merge (removes Tailwind classes that clash).
 */
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Joins class names and keeps only the last of any clashing Tailwind classes.
 *
 * @param classNames - strings, arrays or `{ className: condition }` objects
 * @returns one className string, for example cn('p-2', isWide && 'p-4') gives 'p-4' when isWide
 */
export function cn(...classNames: ClassValue[]): string {
  return twMerge(clsx(classNames));
}
