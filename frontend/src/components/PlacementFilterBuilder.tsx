import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SlidersHorizontal, Plus, X, Save, FolderOpen } from "lucide-react";
import type { FilterCondition, FilterPreset, FilterField, FilterOperator } from "../types/dashboard";

const FILTER_FIELD_LABELS: Record<FilterField, string> = {
  cgpa: "CGPA",
  branch: "Branch",
  skills: "Skills",
  company: "Company",
  package: "Package (LPA)",
  graduationYear: "Graduation Year",
};

const FILTER_OPERATORS_FOR_FIELD: Record<FilterField, { label: string; value: FilterOperator }[]> = {
  cgpa:           [{ label: "≥", value: "gte" }, { label: "≤", value: "lte" }, { label: "=", value: "eq" }],
  package:        [{ label: "≥", value: "gte" }, { label: "≤", value: "lte" }, { label: "=", value: "eq" }],
  graduationYear: [{ label: "=", value: "eq" }, { label: "≥", value: "gte" }, { label: "≤", value: "lte" }],
  branch:         [{ label: "includes", value: "in" }, { label: "is", value: "eq" }],
  skills:         [{ label: "contains", value: "in" }],
  company:        [{ label: "contains", value: "contains" }, { label: "is", value: "eq" }],
};

const AVAILABLE_DEPARTMENTS = [
  "Computer Engineering",
  "Information Technology",
  "AI & Data Science",
  "E&TC",
  "Electrical",
  "Mechanical",
  "Civil"
];

export default function PlacementFilterBuilder({
  conditions,
  setConditions,
  totalDrives,
  filteredCount,
}: {
  conditions: FilterCondition[];
  setConditions: (c: FilterCondition[]) => void;
  totalDrives: number;
  filteredCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [presets, setPresets] = useState<FilterPreset[]>(() => {
    try {
      return JSON.parse(window.localStorage.getItem("placetrack-filter-presets") ?? "[]");
    } catch { return []; }
  });
  const [showPresetInput, setShowPresetInput] = useState(false);
  const [showPresetMenu, setShowPresetMenu] = useState(false);

  const addCondition = () => {
    setConditions([
      ...conditions,
      { id: Math.random().toString(36).slice(2), field: "cgpa", operator: "gte", value: "" }
    ]);
    setOpen(true);
  };

  const removeCondition = (id: string) =>
    setConditions(conditions.filter((c) => c.id !== id));

  const updateCondition = (id: string, patch: Partial<FilterCondition>) =>
    setConditions(conditions.map((c) => c.id === id ? { ...c, ...patch } : c));

  const resetAll = () => setConditions([]);

  const savePreset = () => {
    if (!presetName.trim()) return;
    const updated = [
      ...presets.filter((p) => p.name !== presetName.trim()),
      { name: presetName.trim(), conditions }
    ];
    setPresets(updated);
    try { window.localStorage.setItem("placetrack-filter-presets", JSON.stringify(updated)); } catch {}
    setPresetName("");
    setShowPresetInput(false);
  };

  const loadPreset = (preset: FilterPreset) => {
    setConditions(preset.conditions);
    setShowPresetMenu(false);
    setOpen(true);
  };

  const deletePreset = (name: string) => {
    const updated = presets.filter((p) => p.name !== name);
    setPresets(updated);
    try { window.localStorage.setItem("placetrack-filter-presets", JSON.stringify(updated)); } catch {}
  };

  const hasActiveFilters = conditions.length > 0 && conditions.some((c) => c.value.trim());

  return (
    <div style={{
      marginBottom: "20px",
      borderRadius: "16px",
      border: `1px solid ${hasActiveFilters ? "rgba(136, 189, 242, 0.3)" : "var(--line)"}`,
      background: "var(--panel)",
      overflow: "hidden",
      transition: "border-color 0.2s"
    }}>
      {/* Header bar — always visible */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "10px",
          padding: "14px 20px",
          cursor: "pointer",
          userSelect: "none"
        }}
        onClick={() => setOpen((v) => !v)}
        role="button"
        aria-expanded={open}
        aria-label="Toggle filter builder"
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            width: "32px", height: "32px", borderRadius: "8px",
            background: hasActiveFilters ? "rgba(136, 189, 242, 0.12)" : "var(--panel-2)",
            border: `1px solid ${hasActiveFilters ? "rgba(136, 189, 242, 0.2)" : "var(--line)"}`,
            display: "grid", placeItems: "center"
          }}>
            <SlidersHorizontal size={15} style={{ color: hasActiveFilters ? "var(--secondary)" : "var(--muted)" }} />
          </div>
          <div>
            <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text)" }}>Filter Builder</span>
            <span style={{ fontSize: "11px", color: "var(--muted)", marginLeft: "8px" }}>
              Showing <b style={{ color: hasActiveFilters ? "var(--secondary)" : "var(--text)" }}>{filteredCount}</b> of {totalDrives} drives
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }} onClick={(e) => e.stopPropagation()}>
          {/* Active filter chips (always visible) */}
          {conditions.filter((c) => c.value.trim()).map((cond) => (
            <span
              key={cond.id}
              style={{
                display: "inline-flex", alignItems: "center", gap: "5px",
                padding: "3px 10px", borderRadius: "20px", fontSize: "11px",
                fontWeight: 600, background: "rgba(136, 189, 242, 0.1)",
                border: "1px solid rgba(136, 189, 242, 0.2)", color: "var(--secondary)"
              }}
            >
              {FILTER_FIELD_LABELS[cond.field]}:&nbsp;
              {cond.operator === "gte" ? "≥" : cond.operator === "lte" ? "≤" : ""}&nbsp;
              {cond.value.length > 16 ? cond.value.slice(0, 16) + "…" : cond.value}
              <button
                type="button"
                onClick={() => removeCondition(cond.id)}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", color: "var(--secondary)" }}
                aria-label={`Remove ${cond.field} filter`}
              >
                <X size={11} />
              </button>
            </span>
          ))}

          <button
            id="filter-builder-add-condition"
            type="button"
            onClick={addCondition}
            style={{
              display: "inline-flex", alignItems: "center", gap: "5px",
              padding: "5px 12px", borderRadius: "8px", fontSize: "11px", fontWeight: 600,
              background: "var(--hover)", border: "1px solid var(--line)",
              color: "var(--primary)", cursor: "pointer"
            }}
          >
            <Plus size={12} /> Add Filter
          </button>

          {hasActiveFilters && (
            <button
              id="filter-builder-reset"
              type="button"
              onClick={resetAll}
              style={{
                display: "inline-flex", alignItems: "center", gap: "5px",
                padding: "5px 12px", borderRadius: "8px", fontSize: "11px", fontWeight: 600,
                background: "rgba(255, 107, 107, 0.07)", border: "1px solid rgba(255, 107, 107, 0.2)",
                color: "var(--error)", cursor: "pointer"
              }}
            >
              <X size={12} /> Reset
            </button>
          )}

          {/* Expand / collapse chevron */}
          <span style={{ color: "var(--muted)", display: "flex" }}>
            {open
              ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 15l-6-6-6 6"/></svg>
              : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
            }
          </span>
        </div>
      </div>

      {/* Expanded condition rows */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            style={{ overflow: "hidden" }}
          >
            <div style={{ padding: "0 20px 16px", borderTop: "1px solid var(--line)" }}>
              {conditions.length === 0 ? (
                <p style={{ fontSize: "12px", color: "var(--muted)", padding: "16px 0", textAlign: "center" }}>
                  No filter conditions added. Click <b>Add Filter</b> to start building.
                </p>
              ) : (
                <div style={{ display: "grid", gap: "10px", marginTop: "14px" }}>
                  {conditions.map((cond, idx) => {
                    const opOptions = FILTER_OPERATORS_FOR_FIELD[cond.field];
                    return (
                      <motion.div
                        key={cond.id}
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.15 }}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "140px 90px 1fr auto",
                          gap: "8px",
                          alignItems: "center",
                          padding: "10px 14px",
                          borderRadius: "10px",
                          background: "var(--panel-2)",
                          border: "1px solid var(--line)"
                        }}
                      >
                        {/* Field selector */}
                        <select
                          id={`filter-field-${idx}`}
                          value={cond.field}
                          onChange={(e) => {
                            const field = e.target.value as FilterField;
                            const op = FILTER_OPERATORS_FOR_FIELD[field][0].value;
                            updateCondition(cond.id, { field, operator: op, value: "" });
                          }}
                          style={{
                            padding: "7px 10px", borderRadius: "8px", fontSize: "12px",
                            background: "var(--panel)", border: "1px solid var(--line)",
                            color: "var(--text)", fontWeight: 600, cursor: "pointer"
                          }}
                        >
                          {(Object.keys(FILTER_FIELD_LABELS) as FilterField[]).map((f) => (
                            <option key={f} value={f}>{FILTER_FIELD_LABELS[f]}</option>
                          ))}
                        </select>

                        {/* Operator selector */}
                        <select
                          id={`filter-operator-${idx}`}
                          value={cond.operator}
                          onChange={(e) => updateCondition(cond.id, { operator: e.target.value as FilterOperator })}
                          style={{
                            padding: "7px 8px", borderRadius: "8px", fontSize: "12px",
                            background: "var(--panel)", border: "1px solid var(--line)",
                            color: "var(--text)", fontWeight: 600, cursor: "pointer"
                          }}
                        >
                          {opOptions.map((op) => (
                            <option key={op.value} value={op.value}>{op.label}</option>
                          ))}
                        </select>

                        {/* Value input */}
                        {cond.field === "branch" ? (
                          <select
                            id={`filter-value-${idx}`}
                            value={cond.value}
                            onChange={(e) => updateCondition(cond.id, { value: e.target.value })}
                            style={{
                              padding: "7px 10px", borderRadius: "8px", fontSize: "12px",
                              background: "var(--panel)", border: "1px solid var(--line)",
                              color: cond.value ? "var(--text)" : "var(--muted)"
                            }}
                          >
                            <option value="">Select branch…</option>
                            {AVAILABLE_DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                          </select>
                        ) : (
                          <input
                            id={`filter-value-${idx}`}
                            type={cond.field === "cgpa" || cond.field === "package" || cond.field === "graduationYear" ? "number" : "text"}
                            placeholder={
                              cond.field === "cgpa" ? "e.g. 8.0" :
                              cond.field === "package" ? "e.g. 10" :
                              cond.field === "graduationYear" ? "e.g. 2026" :
                              cond.field === "skills" ? "e.g. Python, React" :
                              "e.g. TCS"
                            }
                            value={cond.value}
                            onChange={(e) => updateCondition(cond.id, { value: e.target.value })}
                            step={cond.field === "cgpa" ? "0.1" : "1"}
                            min={cond.field === "cgpa" ? "0" : cond.field === "package" ? "0" : undefined}
                            max={cond.field === "cgpa" ? "10" : undefined}
                            style={{
                              padding: "7px 12px", borderRadius: "8px", fontSize: "12px",
                              background: "var(--panel)", border: "1px solid var(--line)",
                              color: "var(--text)", width: "100%"
                            }}
                          />
                        )}

                         {/* Remove button */}
                         <button
                           type="button"
                           id={`filter-remove-${idx}`}
                           onClick={() => removeCondition(cond.id)}
                           style={{
                             width: "30px", height: "30px", borderRadius: "8px",
                             background: "rgba(255, 107, 107, 0.07)", border: "1px solid rgba(255, 107, 107, 0.2)",
                             color: "var(--error)", cursor: "pointer", display: "grid", placeItems: "center"
                           }}
                           aria-label="Remove condition"
                         >
                           <X size={13} />
                         </button>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* Preset save / load row */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "14px", flexWrap: "wrap" }}>
                {/* Save preset */}
                {!showPresetInput ? (
                  <button
                    id="filter-save-preset"
                    type="button"
                    onClick={() => setShowPresetInput(true)}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: "5px",
                      padding: "5px 12px", borderRadius: "8px", fontSize: "11px", fontWeight: 600,
                      background: "var(--panel-2)", border: "1px solid var(--line)",
                      color: "var(--muted)", cursor: "pointer"
                    }}
                  >
                    <Save size={12} /> Save Preset
                  </button>
                ) : (
                   <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                    <input
                      id="filter-preset-name"
                      autoFocus
                      value={presetName}
                      onChange={(e) => setPresetName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && savePreset()}
                      placeholder="Preset name…"
                      style={{
                        padding: "5px 10px", borderRadius: "8px", fontSize: "11px",
                        background: "var(--panel)", border: "1px solid var(--primary)",
                        color: "var(--text)", width: "130px"
                      }}
                    />
                    <button type="button" onClick={savePreset}
                      style={{ padding: "5px 10px", borderRadius: "8px", fontSize: "11px", fontWeight: 600,
                        background: "var(--primary)", border: "none", color: "var(--bg)", cursor: "pointer" }}
                    >Save</button>
                    <button type="button" onClick={() => { setShowPresetInput(false); setPresetName(""); }}
                      style={{ padding: "5px", borderRadius: "6px", background: "none", border: "none",
                        color: "var(--muted)", cursor: "pointer", display: "flex" }}>
                      <X size={13} />
                    </button>
                  </div>
                )}

                {/* Load preset */}
                {presets.length > 0 && (
                  <div style={{ position: "relative" }}>
                    <button
                      id="filter-load-preset"
                      type="button"
                      onClick={() => setShowPresetMenu((v) => !v)}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: "5px",
                        padding: "5px 12px", borderRadius: "8px", fontSize: "11px", fontWeight: 600,
                        background: "var(--panel-2)", border: "1px solid var(--line)",
                        color: "var(--muted)", cursor: "pointer"
                      }}
                    >
                      <FolderOpen size={12} /> Load Preset
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
                    </button>
                    {showPresetMenu && (
                      <>
                        <div onClick={() => setShowPresetMenu(false)}
                          style={{ position: "fixed", inset: 0, zIndex: 40 }} />
                        <div style={{
                          position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 50,
                          background: "var(--panel)", border: "1px solid var(--line)",
                          borderRadius: "10px", padding: "6px", minWidth: "180px",
                          boxShadow: "0 8px 24px rgba(0,0,0,0.3)"
                        }}>
                          {presets.map((p) => (
                            <div key={p.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 8px", borderRadius: "6px" }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--panel-2)")}
                              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                            >
                              <button type="button" onClick={() => loadPreset(p)}
                                style={{ background: "none", border: "none", cursor: "pointer", fontSize: "12px",
                                  color: "var(--text)", fontWeight: 500, textAlign: "left", flex: 1 }}>
                                {p.name} <span style={{ color: "var(--muted)", fontSize: "10px" }}>({p.conditions.length})</span>
                              </button>
                              <button type="button" onClick={() => deletePreset(p.name)}
                                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--error)", display: "flex", padding: "2px" }}>
                                <X size={11} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
