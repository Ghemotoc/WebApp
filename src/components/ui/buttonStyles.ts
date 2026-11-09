/**
 * buttonStyles: the classes of every button variant and size (bundle G3 COMPONENTS), kept apart
 * from Button.tsx so links and other elements drawn as buttons can share the exact look.
 * Who uses it: Button and any link drawn as a button (buttonClassName). What it calls: the
 * button-main and button-glass utilities in src/styles/index.css.
 */
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

/** The classes for each variant and size. */
export const buttonStyles = cva(
  'inline-flex items-center justify-center gap-2 rounded-full font-body font-semibold whitespace-nowrap no-underline disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'button-main',
        secondary: 'button-glass',
        text: 'h-11 bg-transparent px-0 text-link underline hover:text-link-hover',
        destructive: 'button-glass border-destructive text-destructive',
      },
      size: {
        md: 'h-11 px-5 text-sm',
        lg: 'h-12 px-6 text-[15px]',
        xl: 'h-13 px-6 text-[15px]',
      },
    },
    // A text button sits flush with the text around it: the size's side padding would otherwise
    // win (it comes later in the class list), indenting every text link by 20 px (bundle G6).
    compoundVariants: [{ variant: 'text', class: 'px-0' }],
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

/** The variant and size a button-shaped element can take. */
export type ButtonLook = VariantProps<typeof buttonStyles>;

/**
 * The classes of a button, for a link (or another element) drawn as one.
 *
 * @param look - the variant and size (primary and md by default)
 * @param extraClasses - any classes to add, such as self-start
 * @returns the class string
 */
export function buttonClassName(look: ButtonLook = {}, extraClasses?: string): string {
  return cn(buttonStyles(look), extraClasses);
}
