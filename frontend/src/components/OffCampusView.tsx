import { useEffect, useMemo, useState } from "react";
import { Plus, X, Loader2, Pencil, Trash2, ExternalLink, CalendarClock } from "lucide-react";
import { api } from "@/lib/api";
import PageTitle from "./PageTitle";
import { EmptyState } from "./OverviewView";

type Status = "APPLIED" | "ASSESSMENT" | "INTERVIEW" | "OFFER" | "REJECTED" | "WITHDRAWN";
type Entry = {
  id: string;
  company: string;
  role: string;
  type: "JOB" | "INTERNSHIP";
  link: string | null;
  location: string | null;
  compensation: string | null;
  appliedOn: string;
  followUpOn: string | null;
  status: Status;
  notes: string | null;
  timeline: Array<{ at: string; status: Status; note: string }>;
};

const STATUSES: Array<{ value: Status; label: string }> = [
  { value: "APPLIED", label: "Applied" },
  { value: "ASSESSMENT", label: "Test / assignment" },
  { value: "INTERVIEW", label: "Interview" },
  { value: "OFFER", label: "Offer received" },
  { value: "REJECTED", label: "Rejected" },
  { value: "WITHDRAWN", label: "Withdrawn" }
];
const label = (status: Status) => STATUSES.find((s) => s.value === status)?.label ?? status;
const day = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const inputDate = (iso: string | null) => (iso ? iso.slice(0, 10) : "");
const safeLink = (url: string | null) => (url && /^https?:\/\//i.test(url) ? url : null);

/** Student-only private tracker for jobs and internships applied for outside the college drives. */
export function OffCampusView({ token, flash }: { token: string; flash: (message: string) => void }) {
  const [items, setItems] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"ALL" | Status>("ALL");
  const [editing, setEditing] = useState<Entry | "new" | null>(null);
  const [updating, setUpdating] = useState<Entry | null>(null);

  const load = () => {
    setLoading(true);
    api<Entry[]>("/api/off-campus", token)
      .then((data) => { setItems(data); setError(""); })
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load your applications"))
      .finally(() => setLoading(false));
  };
  useEffect(load, [token]);

  const counts = useMemo(() => {
    const open = items.filter((i) => ["APPLIED", "ASSESSMENT", "INTERVIEW"].includes(i.status)).length;
    return { total: items.length, open, interviews: items.filter((i) => i.status === "INTERVIEW").length, offers: items.filter((i) => i.status === "OFFER").length };
  }, [items]);
  const today = new Date().toISOString().slice(0, 10);
  const due = items.filter((i) => i.followUpOn && i.followUpOn.slice(0, 10) <= today && ["APPLIED", "ASSESSMENT", "INTERVIEW"].includes(i.status));
  const visible = filter === "ALL" ? items : items.filter((i) => i.status === filter);

  const remove = async (entry: Entry) => {
    if (!window.confirm(`Remove ${entry.company} (${entry.role}) from your tracker?`)) return;
    try {
      await api(`/api/off-campus/${entry.id}`, token, { method: "DELETE" });
      setItems((prev) => prev.filter((i) => i.id !== entry.id));
      flash("Removed");
    } catch (e) {
      flash(e instanceof Error ? e.message : "Could not remove");
    }
  };

  const saved = (entry: Entry) => {
    setItems((prev) => [entry, ...prev.filter((i) => i.id !== entry.id)]);
  };

  return (
    <>
      <PageTitle eyebrow="Private to you" title="Off-campus applications." copy="Keep track of jobs and internships you applied for outside the college drives. Only you can see this page: coordinators and admins cannot." />
      <section className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 12, marginBottom: 16 }}>
        <div className="card"><span className="card-kicker">Applied</span><h3>{counts.total}</h3></div>
        <div className="card"><span className="card-kicker">In progress</span><h3>{counts.open}</h3></div>
        <div className="card"><span className="card-kicker">Interviews</span><h3>{counts.interviews}</h3></div>
        <div className="card"><span className="card-kicker">Offers</span><h3>{counts.offers}</h3></div>
      </section>
      {due.length > 0 && (
        <p className="suggestion" style={{ marginBottom: 16 }}>
          <CalendarClock size={14} /> Follow up with: {due.map((i) => i.company).join(", ")}. You can update the status or move the reminder date.
        </p>
      )}
      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <select value={filter} onChange={(e) => setFilter(e.target.value as "ALL" | Status)} aria-label="Filter by status">
          <option value="ALL">All statuses</option>
          {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <button className="primary-button" onClick={() => setEditing("new")}><Plus size={16} /> Add application</button>
      </div>
      {loading ? <p className="helper-text"><Loader2 className="spin" size={14} /> Loading...</p>
        : error ? <p className="suggestion">{error}</p>
        : visible.length === 0 ? <EmptyState title="Nothing here yet" copy="Add a job or internship you applied for, then update it whenever the company replies." />
        : (
          <div style={{ display: "grid", gap: 12 }}>
            {visible.map((entry) => {
              const link = safeLink(entry.link);
              return (
                <article className="card" key={entry.id}>
                  <div className="card-head">
                    <div>
                      <span className="card-kicker">{entry.type === "JOB" ? "Job" : "Internship"} · applied {day(entry.appliedOn)}</span>
                      <h3>{entry.company} · {entry.role}</h3>
                    </div>
                    <strong>{label(entry.status)}</strong>
                  </div>
                  <p className="helper-text">
                    {[entry.location, entry.compensation, entry.followUpOn ? `Follow up ${day(entry.followUpOn)}` : ""].filter(Boolean).join(" · ")}
                  </p>
                  {entry.notes && <p className="section-copy">{entry.notes}</p>}
                  <ol style={{ margin: "12px 0", paddingLeft: 18 }}>
                    {entry.timeline.map((step, index) => <li key={index}><b>{label(step.status)}</b> · {day(step.at)} · {step.note}</li>)}
                  </ol>
                  <div className="inline-actions">
                    <button className="primary-button" onClick={() => setUpdating(entry)}>Company replied</button>
                    <button className="ghost-button" onClick={() => setEditing(entry)}><Pencil size={14} /> Edit</button>
                    {link && <a className="ghost-button" href={link} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} /> Open link</a>}
                    <button className="ghost-button" onClick={() => remove(entry)} aria-label={`Remove ${entry.company}`}><Trash2 size={14} /> Remove</button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      {editing && <EntryModal entry={editing === "new" ? null : editing} token={token} onClose={() => setEditing(null)} onSaved={(e) => { saved(e); flash(editing === "new" ? "Application added" : "Application updated"); }} />}
      {updating && <ReplyModal entry={updating} token={token} onClose={() => setUpdating(null)} onSaved={(e) => { saved(e); flash("Update saved"); }} />}
    </>
  );
}

function Modal({ title, kicker, onClose, children }: { title: string; kicker: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="card profile-modal" onClick={(e) => e.stopPropagation()}>
        <div className="card-head">
          <div><span className="card-kicker">{kicker}</span><h3>{title}</h3></div>
          <button onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>
        {children}
      </section>
    </div>
  );
}

function EntryModal({ entry, token, onClose, onSaved }: { entry: Entry | null; token: string; onClose: () => void; onSaved: (entry: Entry) => void }) {
  const [form, setForm] = useState({
    company: entry?.company ?? "",
    role: entry?.role ?? "",
    type: entry?.type ?? "JOB",
    link: entry?.link ?? "",
    location: entry?.location ?? "",
    compensation: entry?.compensation ?? "",
    appliedOn: inputDate(entry?.appliedOn ?? new Date().toISOString()),
    followUpOn: inputDate(entry?.followUpOn ?? null),
    notes: entry?.notes ?? ""
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm({ ...form, [key]: e.target.value });

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const body = entry
        ? { company: form.company, role: form.role, type: form.type, link: form.link, location: form.location || null, compensation: form.compensation || null, followUpOn: form.followUpOn || null, notes: form.notes || null }
        : { ...form, appliedOn: form.appliedOn || undefined, followUpOn: form.followUpOn || undefined };
      const saved = await api<Entry>(entry ? `/api/off-campus/${entry.id}` : "/api/off-campus", token, { method: entry ? "PATCH" : "POST", body: JSON.stringify(body) });
      onSaved(saved);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={entry ? "Edit application" : "Add application"} kicker="Off-campus" onClose={onClose}>
      <form onSubmit={submit} className="profile-form">
        <label>Company<input value={form.company} onChange={set("company")} required maxLength={120} /></label>
        <label>Role<input value={form.role} onChange={set("role")} required maxLength={160} /></label>
        <label>Type
          <select value={form.type} onChange={set("type")}><option value="JOB">Job</option><option value="INTERNSHIP">Internship</option></select>
        </label>
        <label>Application / careers link<input type="url" placeholder="https://" value={form.link} onChange={set("link")} /></label>
        <label>Location<input value={form.location} onChange={set("location")} maxLength={120} /></label>
        <label>Package / stipend<input value={form.compensation} onChange={set("compensation")} maxLength={80} placeholder="e.g. 6 LPA or 20k/month" /></label>
        {!entry && <label>Applied on<input type="date" value={form.appliedOn} onChange={set("appliedOn")} /></label>}
        <label>Follow-up reminder<input type="date" value={form.followUpOn} onChange={set("followUpOn")} /></label>
        <label style={{ gridColumn: "1 / -1" }}>Notes<textarea rows={3} value={form.notes} onChange={set("notes")} maxLength={2000} placeholder="Recruiter name, referral, anything to remember" /></label>
        {error && <p className="suggestion" style={{ gridColumn: "1 / -1" }}>{error}</p>}
        <div className="inline-actions" style={{ gridColumn: "1 / -1", marginTop: 12 }}>
          <button className="primary-button" type="submit" disabled={saving}>{saving && <Loader2 className="spin" size={16} />} Save</button>
          <button className="ghost-button" type="button" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </Modal>
  );
}

function ReplyModal({ entry, token, onClose, onSaved }: { entry: Entry; token: string; onClose: () => void; onSaved: (entry: Entry) => void }) {
  const [status, setStatus] = useState<Status>(entry.status === "APPLIED" ? "ASSESSMENT" : entry.status);
  const [update, setUpdate] = useState("");
  const [followUpOn, setFollowUpOn] = useState(inputDate(entry.followUpOn));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const saved = await api<Entry>(`/api/off-campus/${entry.id}`, token, {
        method: "PATCH",
        body: JSON.stringify({ status, update: update || undefined, followUpOn: followUpOn || null })
      });
      onSaved(saved);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={`${entry.company} replied`} kicker={entry.role} onClose={onClose}>
      <form onSubmit={submit} className="profile-form">
        <label>New status
          <select value={status} onChange={(e) => setStatus(e.target.value as Status)}>{STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select>
        </label>
        <label>Next follow-up reminder<input type="date" value={followUpOn} onChange={(e) => setFollowUpOn(e.target.value)} /></label>
        <label style={{ gridColumn: "1 / -1" }}>What did they say?<textarea rows={3} value={update} maxLength={500} onChange={(e) => setUpdate(e.target.value)} placeholder="e.g. Online test on 12 Nov, link sent on mail" /></label>
        {error && <p className="suggestion" style={{ gridColumn: "1 / -1" }}>{error}</p>}
        <div className="inline-actions" style={{ gridColumn: "1 / -1", marginTop: 12 }}>
          <button className="primary-button" type="submit" disabled={saving}>{saving && <Loader2 className="spin" size={16} />} Save update</button>
          <button className="ghost-button" type="button" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </Modal>
  );
}
