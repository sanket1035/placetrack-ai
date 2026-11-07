export function formatPackage(min: number, max?: number | null): string {
  const n = (value: number) => String(Number(value.toFixed(2)));
  if (max == null || max <= min) return `${n(min)} LPA`;
  return `${n(min)}-${n(max)} LPA`;
}
