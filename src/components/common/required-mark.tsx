/** Red asterisk after the label of a required field. */
export function RequiredMark() {
  return (
    <span className="text-destructive" aria-hidden>
      *
    </span>
  );
}
