/**
 * Builds a Postgres text[] array literal string (e.g. `{"a","b"}`) from a JS
 * string array, for use as `${toPgTextArrayLiteral(arr)}::text[]`.
 *
 * postgres.js's `sql.array()` helper relies on inferring the target array
 * type from query context, which turned out to be unreliable inside a
 * dynamic/optional UPDATE assignment here — it intermittently sent the
 * parameter as a plain `text` value (or, for an empty array, an empty
 * string) rather than a proper `text[]`, producing "CASE types text[] and
 * text cannot be matched" / "malformed array literal" / "column is of type
 * text[] but expression is of type text" depending on the exact shape.
 * Building the literal ourselves and casting it explicitly sidesteps that
 * inference entirely — Postgres's own array-literal parser is what parses
 * it, not the driver's array encoder.
 */
export function toPgTextArrayLiteral(arr: string[]): string {
  const escaped = arr.map((s) => `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`);
  return `{${escaped.join(',')}}`;
}
