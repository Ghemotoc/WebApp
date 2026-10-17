/**
 * Button: every kind of button the boards draw (story S1-E1-03).
 *
 * Variants (values from the boards; docs/board-fixes.md lists where the DoD overrides them):
 *   primary      darkest plum with cream text: the one main action on a screen
 *   secondary    white with a #8E7B99 border and plum text
 *   text         underlined violet text, for small actions such as "Why this ad?"
 *   destructive  white with a dark red border and text; solid red is kept for urgent safety
 *                items only (DoD pill system)
 * Sizes: 44 px (md, the minimum touch target the boards use), 48 px (lg), 52 px (xl).
 * Who uses it: every screen. Pass any normal <button> attribute (type, onClick, disabled).
 */
import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

/** The classes for each variant and size. */
const buttonStyles = cva(
  'inline-flex items-center justify-center gap-2 rounded-full font-body font-semibold whitespace-nowrap',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-on-primary hover:opacity-90',
        secondary: 'border border-control-border bg-surface text-heading hover:bg-tint',
        text: 'h-11 bg-transparent px-0 text-link underline hover:text-link-hover',
        destructive: 'border border-destructive bg-surface text-destructive hover:bg-tint',
      },
      size: {
        md: 'h-11 px-5 text-sm',
        lg: 'h-12 px-6 text-[15px]',
        xl: 'h-13 px-6 text-[15px]',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

/** A normal <button>'s attributes plus the variant and size. */
export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonStyles>;

/**
 * Renders a button. type defaults to "button" so it never submits a form by accident.
 *
 * @returns the button element
 */
export function Button({ variant, size, className, type = 'button', ...buttonProps }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonStyles({ variant, size }), className)}
      {...buttonProps}
    />
  );
}
