/**
 * Button: every kind of button the boards draw (story S1-E1-03; restyled in bundle G3 COMPONENTS
 * from the liquid glass handoff, "Components: variants and states").
 *
 * Variants:
 *   primary      the action that finishes a task (Publish, Save, Continue, Create account): the
 *                theme accent's gradient with white text (button-main in src/styles/index.css;
 *                plum in Lilac mist and at night, black in the staff area)
 *   secondary    every add action and "not yet" state (New story, Add chapter, Follow): clear grey
 *                glass with ink text (button-glass)
 *   text         underlined link-coloured text, for small actions such as "Why this ad?"
 *   destructive  glass with a dark red border and text; solid red is kept for urgent safety
 *                items only (DoD pill system)
 * Sizes: 44 px (md, every button and pill in the handoff), 48 px (lg), 52 px (xl).
 * States: hover brightens, a press scales to 98 %, focus shows the 3 px ring with its halo
 * (index.css), disabled is half see-through, and isLoading keeps the label, adds a small spinner
 * and disables the button (aria-busy), so a second click can't send twice.
 * Who uses it: every screen. Pass any normal <button> attribute (type, onClick, disabled). Links
 * drawn as buttons use buttonClassName() from buttonStyles.ts for the same look.
 */
import type { ButtonHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

import { buttonStyles, type ButtonLook } from './buttonStyles';

/** A normal <button>'s attributes plus the variant, size and loading state. */
export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  ButtonLook & {
    /** True while the action runs: the label stays, a spinner shows and the button is disabled. */
    isLoading?: boolean;
  };

/**
 * The small spinner shown while a button's action runs. Decorative: aria-busy on the button says
 * it is working.
 *
 * @returns the spinner
 */
function ButtonSpinner() {
  return (
    <span
      aria-hidden="true"
      data-button-spinner
      className="inline-block size-4 shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent"
    />
  );
}

/**
 * Renders a button. type defaults to "button" so it never submits a form by accident.
 *
 * @returns the button element
 */
export function Button({
  variant,
  size,
  className,
  type = 'button',
  isLoading = false,
  disabled,
  children,
  ...buttonProps
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonStyles({ variant, size }), className)}
      disabled={disabled === true || isLoading}
      aria-busy={isLoading || undefined}
      {...buttonProps}
    >
      {isLoading && <ButtonSpinner />}
      {children}
    </button>
  );
}
