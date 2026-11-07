/** "4.5 LPA" for a fixed package, "3.5-5 LPA" when the company gives a range (stored as `package` = minimum, `packageMax` = maximum). */
export function formatPackage(min: number, max?: number | null): string {
  const n = (value: number) => String(Number(value.toFixed(2)));
  if (max == null || max <= min) return `${n(min)} LPA`;
  return `${n(min)}-${n(max)} LPA`;
}
