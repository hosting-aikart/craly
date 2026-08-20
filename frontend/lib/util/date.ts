/** "15 September" style date, matching how the enquiry form's date picker reads back. */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'long' });
}
