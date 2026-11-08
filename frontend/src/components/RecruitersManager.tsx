import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { api } from "@/lib/api";
import PageTitle from "./PageTitle";

type Recruiter = { id: string; name: string };

export function RecruitersManager({ token, flash }: { token: string; flash: (message: string) => void }) {
  const [items, setItems] = useState<Recruiter[]>([]);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try { setItems(await api<Recruiter[]>("/api/recruiters", token)); }
    catch (error) { flash(error instanceof Error ? error.message : "Could not load recruiters"); }
  }, [token, flash]);
  useEffect(() => { load(); }, [load]);

  const add = async () => {
    const names = text.split(/\r?\n|,/).map((line) => line.trim()).filter(Boolean);
    if (names.length === 0) { flash("Paste at least one company name."); return; }
    setSaving(true);
    try {
      const result = await api<{ added: number; skipped: number }>("/api/recruiters/bulk", token, { method: "POST", body: JSON.stringify({ names }) });
      flash(`Added ${result.added} companies${result.skipped ? `, ${result.skipped} already in the list` : ""}.`);
      setText("");
      await load();
    } catch (error) {
      flash(error instanceof Error ? error.message : "Could not add companies");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (item: Recruiter) => {
    try {
      await api(`/api/recruiters/${item.id}`, token, { method: "DELETE" });
      setItems((old) => old.filter((row) => row.id !== item.id));
    } catch (error) {
      flash(error instanceof Error ? error.message : "Could not remove");
    }
  };

  return (
    <>
      <PageTitle eyebrow="Landing page" title="Our past recruiters." copy="Every company that has hired from the college. These names show on the public landing page, whether or not the drive was created in PlaceTrack." />
      <section className="card form-card" style={{ display: "grid", gap: 12 }}>
        <label>Add companies (one per line, or separated by commas)
          <textarea rows={6} placeholder={"Infosys\nTCS\nWipro"} value={text} onChange={(e) => setText(e.target.value)} />
        </label>
        <button className="primary-button" style={{ width: "fit-content" }} onClick={add} disabled={saving}>
          {saving ? <Loader2 className="spin" size={16} /> : <Plus size={16} />} Add to list
        </button>
      </section>
      <section className="card" style={{ marginTop: 16, padding: 20 }}>
        <strong>{items.length} companies</strong>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
          {items.map((item) => (
            <span key={item.id} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 8px 6px 14px", border: "1px solid var(--line)", borderRadius: 999, fontSize: 13, fontWeight: 600 }}>
              {item.name}
              <button type="button" aria-label={`Remove ${item.name}`} onClick={() => remove(item)} style={{ all: "unset", cursor: "pointer", display: "grid", placeItems: "center", width: 20, height: 20, borderRadius: 999 }}><X size={13} /></button>
            </span>
          ))}
          {items.length === 0 && <span style={{ color: "var(--muted)", fontSize: 13 }}>No companies yet.</span>}
        </div>
      </section>
    </>
  );
}
