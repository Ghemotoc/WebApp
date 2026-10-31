/**
 * OrDivider: the thin line with a word in the middle ("or", "or sign up with") between two ways
 * of signing in (story S1-E2-09; boards SignIn.dc.html and Main.dc.html).
 *
 * It is only decoration: each group around it has its own label, so screen readers skip it.
 * Who shows it: SocialSignUp and SignInPage.
 */

/**
 * Renders the divider.
 *
 * @param props.label - the word or words in the middle
 * @returns the divider
 */
export function OrDivider({ label }: { label: string }) {
  return (
    <div
      aria-hidden="true"
      className="flex items-center gap-[14px] text-[13px] font-semibold text-meta"
    >
      <span className="h-px flex-1 bg-border" />
      {label}
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}
