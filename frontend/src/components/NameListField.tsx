"use client";

import { parseNames } from "@/lib/profile";

/** A textarea where the student types one name per line. The count below is the number of names. */
export default function NameListField({
  label, noun, value, onChange, placeholder
}: {
  label: string;
  noun: string;
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
}) {
  const count = parseNames(value).length;
  return (
    <label style={{ gridColumn: "1 / -1" }}>
      {label}
      <textarea
        rows={3}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        style={{ resize: "vertical", minHeight: "76px" }}
      />
      <span className="helper-text" style={{ textTransform: "none", letterSpacing: "normal" }}>
        One {noun} per line. Count: <b>{count}</b>
      </span>
    </label>
  );
}
