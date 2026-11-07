/** Indian academic/placement year starts in June: Nov 2026 -> "2026-27", Mar 2027 -> "2026-27". */
export function placementSeason(date: Date = new Date()): string {
  const start = date.getMonth() >= 5 ? date.getFullYear() : date.getFullYear() - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
}
