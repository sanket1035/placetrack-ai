// PageTitle.tsx — Shared page-level heading component used across feature view modules.
import { CalendarDays } from "lucide-react";

export default function PageTitle({
  eyebrow,
  title,
  copy,
}: {
  eyebrow: string;
  title: string;
  copy: string;
}) {
  return (
    <div className="page-title">
      <div>
        <span>{eyebrow}</span>
        <h1>{title}</h1>
        <p>{copy}</p>
      </div>
      <div className="date-pill">
        <CalendarDays size={16} /> Placement season 2025-26
      </div>
    </div>
  );
}
