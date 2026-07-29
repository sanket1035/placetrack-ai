import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import type { Role, Application } from "../types/dashboard";
import { api } from "@/lib/api";
import { initials, getLogoUrl, pretty } from "../lib/queries";
import { ApplicationTimeline } from "./ApplicationTimeline";
import PageTitle from "./PageTitle";
import TableSkeleton from "./ui/TableSkeleton";
import { EmptyState } from "./OverviewView";

const statusOptions = ["APPLIED", "SHORTLISTED", "APTITUDE_CLEARED", "TECHNICAL_ROUND", "HR_ROUND", "SELECTED", "REJECTED"];

export function Applications({
  role,
  token,
  applications,
  onRefresh,
  flash,
  loading
}: {
  role: Role;
  token: string;
  applications: Application[];
  onRefresh: () => void;
  flash: (message: string) => void;
  loading: boolean;
}) {
  const [busyId, setBusyId] = useState("");
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>("");
  const [items, setItems] = useState<Application[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loadingApps, setLoadingApps] = useState(false);

  const fetchPage = async () => {
    if (!token) {
      let filtered = [...applications];
      if (status) {
        filtered = filtered.filter(a => a.status === status);
      }
      setTotal(filtered.length);
      setPages(Math.ceil(filtered.length / 20) || 1);
      setItems(filtered.slice((page - 1) * 20, page * 20));
      return;
    }
    setLoadingApps(true);
    try {
      const queryParams = new URLSearchParams();
      queryParams.set("page", String(page));
      queryParams.set("limit", "20");
      if (status) queryParams.set("status", status);
      const res = await api<any>(`/api/applications?${queryParams.toString()}`, token);
      setItems(res.items || []);
      setTotal(res.total ?? 0);
      setPages(res.pages ?? 1);
    } catch (e) {
      let filtered = [...applications];
      if (status) {
        filtered = filtered.filter(a => a.status === status);
      }
      setTotal(filtered.length);
      setPages(Math.ceil(filtered.length / 20) || 1);
      setItems(filtered.slice((page - 1) * 20, page * 20));
    } finally {
      setLoadingApps(false);
    }
  };

  useEffect(() => {
    fetchPage();
  }, [page, status, token, applications]);

  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus);
    setPage(1);
  };

  const updateStatus = async (id: string, statusVal: string) => {
    setBusyId(id);
    try {
      await api(`/api/applications/${id}/status`, token, {
        method: "PATCH",
        body: JSON.stringify({ status: statusVal, note: "Updated from coordinator UI" })
      });
      flash("Application status updated");
      fetchPage();
      onRefresh();
    } catch (error) {
      flash(error instanceof Error ? error.message : "Update failed");
    } finally {
      setBusyId("");
    }
  };

  const currentLoading = loading || loadingApps;

  return (
    <>
      <PageTitle
        eyebrow="Application center"
        title="Every application, one clear story."
        copy="Track status, timelines, and interview details."
      />

      <div
        className="applications-controls"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "16px",
          marginBottom: "20px",
          flexWrap: "wrap"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "13px", color: "var(--muted)" }}>Filter by Status:</span>
          <select
            value={status}
            onChange={(e) => handleStatusChange(e.target.value)}
            style={{
              background: "var(--surface)",
              color: "var(--text)",
              border: "1px solid var(--panel-3)",
              borderRadius: "6px",
              padding: "6px 12px",
              fontSize: "13px",
              outline: "none",
              cursor: "pointer"
            }}
          >
            <option value="">All Statuses</option>
            <option value="APPLIED">Applied</option>
            <option value="SHORTLISTED">Shortlisted</option>
            <option value="SELECTED">Selected</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>

        {pages > 1 && (
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || currentLoading}
              className="ghost-button"
              style={{ padding: "6px 10px", display: "flex", alignItems: "center", gap: "4px", fontSize: "13px" }}
            >
              <ChevronLeft size={16} /> Prev
            </button>
            <span style={{ fontSize: "13px", color: "var(--muted)" }}>
              Page <strong>{page}</strong> of <strong>{pages}</strong> ({total} total)
            </span>
            <button
              onClick={() => setPage(p => Math.min(pages, p + 1))}
              disabled={page === pages || currentLoading}
              className="ghost-button"
              style={{ padding: "6px 10px", display: "flex", alignItems: "center", gap: "4px", fontSize: "13px" }}
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {currentLoading && items.length === 0 ? (
        <TableSkeleton rows={5} />
      ) : (
        <div className="application-detail-list">
          {items.map((item) => (
            <section className="card application-detail" key={item.id}>
              <div className="application-detail-head">
                <div className="company-logo large" style={{ overflow: "hidden", display: "grid", placeItems: "center" }}>
                  {item.drive.company.logo ? (
                    <img
                      src={getLogoUrl(item.drive.company.logo)!}
                      alt={item.drive.company.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    initials(item.drive.company.name)
                  )}
                </div>
                <div>
                  <h3>{item.drive.company.name}</h3>
                  <p>{item.drive.role}{item.student ? ` · ${item.student.name}` : ""}</p>
                </div>
                <span className="status-badge">{pretty(item.status)}</span>
                <div className="deadline">
                  <span>Updated</span>
                  <strong>{new Date(item.updatedAt).toLocaleDateString()}</strong>
                </div>
              </div>
              <ApplicationTimeline current={Math.max(0, statusOptions.indexOf(item.status))} />
              {role !== "STUDENT" && (
                <div className="inline-actions">
                  <select
                    disabled={busyId === item.id}
                    defaultValue={item.status}
                    onChange={(event) => updateStatus(item.id, event.target.value)}
                  >
                    {statusOptions.map((statusVal) => (
                      <option key={statusVal}>{statusVal}</option>
                    ))}
                  </select>
                  {busyId === item.id && <Loader2 className="spin" size={16} />}
                </div>
              )}
            </section>
          ))}
          {!items.length && (
            <EmptyState title="No applications found" copy="No matching application timelines exist for the current filter." />
          )}
        </div>
      )}
    </>
  );
}
