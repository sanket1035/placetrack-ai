import { CheckCircle2, X, ArrowUpRight, Bookmark, Share2 } from "lucide-react";
import type { Role, Drive, View, FilterCondition } from "../types/dashboard";
import { getCompanyBranding, getLogoUrl, initials } from "../lib/queries";
import PlacementFilterBuilder from "./PlacementFilterBuilder";
import PageTitle from "./PageTitle";
import OpportunityCardSkeleton from "./ui/OpportunityCardSkeleton";

export function Opportunities({
  role,
  token,
  drives,
  onRefresh,
  onNavigate,
  flash,
  onViewDrive,
  loading,
  filterConditions,
  setFilterConditions,
  allDrives
}: {
  role: Role;
  token: string;
  drives: Drive[];
  onRefresh: () => void;
  onNavigate: (view: View) => void;
  flash: (message: string) => void;
  onViewDrive: (drive: Drive) => void;
  loading: boolean;
  filterConditions: FilterCondition[];
  setFilterConditions: (c: FilterCondition[]) => void;
  allDrives: Drive[];
}) {
  const sortedDrives = [...drives].sort((a, b) => {
    // Applied goes last
    if (a.alreadyApplied !== b.alreadyApplied) return a.alreadyApplied ? 1 : -1;
    // Eligible goes before ineligible
    const aElig = a.eligibility?.eligible !== false ? 1 : 0;
    const bElig = b.eligibility?.eligible !== false ? 1 : 0;
    if (aElig !== bElig) return bElig - aElig;
    // Among eligible: higher package first
    return b.package - a.package;
  });

  return (
    <>
      <PageTitle
        eyebrow="Placement drives"
        title="KK Wagh engineering placement profile."
        copy="Drives are filtered by your eligibility — branch, CGPA, and backlogs."
      />
      <PlacementFilterBuilder
        conditions={filterConditions}
        setConditions={setFilterConditions}
        totalDrives={allDrives.length}
        filteredCount={drives.length}
      />
      {loading && drives.length === 0 ? (
        <div className="opportunity-grid" aria-busy="true" aria-label="Loading drives…">
          {Array.from({ length: 6 }).map((_, i) => (
            <OpportunityCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="opportunity-grid">
          {sortedDrives.slice(0, 24).map((drive, index) => {
            const eligible = drive.eligibility?.eligible !== false;
            const hasEligibility = !!drive.eligibility;
            const branding = getCompanyBranding(drive.company.name);
            return (
              <article
                className={`card opportunity-card pastel-${index % 4}`}
                key={drive.id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  padding: "24px",
                  position: "relative",
                  gap: "14px"
                }}
              >
                {/* Badges row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "6px" }}>
                  {hasEligibility && (
                    <div
                      className={eligible ? "status-badge ok" : "status-badge bad"}
                      title={!eligible && drive.eligibility?.reasons ? drive.eligibility.reasons.join("\n") : undefined}
                    >
                      {eligible ? <CheckCircle2 size={10} /> : <X size={10} />}
                      {eligible ? "Eligible" : "Not eligible"}
                    </div>
                  )}
                  <span className="deadline-chip">
                    Closes {new Date(drive.deadline).toLocaleDateString()}
                  </span>
                </div>

                {!eligible && drive.eligibility?.reasons && drive.eligibility.reasons.length > 0 && (
                  <div
                    style={{
                      background: "rgba(255, 107, 107, 0.08)",
                      border: "1px solid rgba(255, 107, 107, 0.2)",
                      borderRadius: "8px",
                      padding: "8px 12px",
                      fontSize: "11px",
                      color: "var(--error)"
                    }}
                  >
                    <strong style={{ display: "block", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "2px" }}>
                      Eligibility Failure Reasons:
                    </strong>
                    <ul style={{ margin: 0, paddingLeft: "16px", display: "grid", gap: "2px" }}>
                      {drive.eligibility.reasons.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Company Logo and Info Header */}
                <div style={{ display: "flex", alignItems: "center", gap: "14px", marginTop: "4px" }}>
                  <div
                    className="opportunity-logo"
                    style={{
                      width: "48px",
                      height: "48px",
                      borderRadius: "12px",
                      background: "var(--bg)",
                      color: "var(--text)",
                      border: "1px solid var(--line)",
                      display: "grid",
                      placeItems: "center",
                      fontSize: "16px",
                      fontWeight: 800,
                      margin: 0,
                      overflow: "hidden"
                    }}
                  >
                    {drive.company.logo ? (
                      <img
                        src={getLogoUrl(drive.company.logo)!}
                        alt={drive.company.name}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      initials(drive.company.name)
                    )}
                  </div>
                  <div>
                    <h3 style={{ margin: 0, font: "700 17px 'Manrope'", color: "var(--text)" }}>{drive.company.name}</h3>
                    <p style={{ margin: "2px 0 0", color: "var(--muted)", fontSize: "12px", fontWeight: 500 }}>{drive.role}</p>
                  </div>
                </div>

                {/* Company brief description */}
                <p style={{ fontSize: "12px", color: "var(--muted)", lineHeight: 1.5, margin: 0 }}>
                  {branding.description}
                </p>

                {/* Metadata Badges */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", margin: "4px 0" }}>
                  <span
                    style={{
                      background: "rgba(255, 255, 255, 0.04)",
                      border: "1px solid rgba(255, 255, 255, 0.05)",
                      borderRadius: "6px",
                      padding: "4px 8px",
                      fontSize: "9px",
                      color: "var(--muted)"
                    }}
                  >
                    Rs {drive.package} LPA
                  </span>
                  <span
                    style={{
                      background: "rgba(255, 255, 255, 0.04)",
                      border: "1px solid rgba(255, 255, 255, 0.05)",
                      borderRadius: "6px",
                      padding: "4px 8px",
                      fontSize: "9px",
                      color: "var(--muted)"
                    }}
                  >
                    {drive.location}
                  </span>
                  <span
                    style={{
                      background: "rgba(255, 255, 255, 0.04)",
                      border: "1px solid rgba(255, 255, 255, 0.05)",
                      borderRadius: "6px",
                      padding: "4px 8px",
                      fontSize: "9px",
                      color: "var(--muted)"
                    }}
                  >
                    CGPA {drive.minCgpa}+
                  </span>
                </div>

                {/* Allowed branches */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                  {(drive.allowedBranches || []).slice(0, 3).map((br) => (
                    <span
                      key={br}
                      style={{
                        fontSize: "8px",
                        background: "var(--hover)",
                        color: "var(--primary)",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        border: "1px solid var(--line)"
                      }}
                    >
                      {br}
                    </span>
                  ))}
                </div>

                {/* Action and social interactions row */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginTop: "auto",
                    paddingTop: "12px",
                    borderTop: "1px solid rgba(255, 255, 255, 0.05)"
                  }}
                >
                  <div style={{ flexGrow: 1 }}>
                    {role === "STUDENT" && drive.alreadyApplied ? (
                      <button className="secondary-button" disabled style={{ width: "100%", justifyContent: "center" }}>
                        Applied <CheckCircle2 size={12} />
                      </button>
                    ) : role === "STUDENT" && drive.eligibility?.eligible === false ? (
                      <button
                        className="secondary-button"
                        onClick={() => onNavigate("Profile")}
                        style={{ width: "100%", justifyContent: "center" }}
                      >
                        Update Profile <ArrowUpRight size={12} />
                      </button>
                    ) : (
                      <button
                        className="primary-button"
                        onClick={() => onViewDrive(drive)}
                        style={{
                          width: "100%",
                          justifyContent: "center"
                        }}
                      >
                        View & Apply <ArrowUpRight size={12} />
                      </button>
                    )}
                  </div>

                  {/* Bookmarks, Share actions */}
                  <button
                    type="button"
                    aria-label="Bookmark"
                    className="secondary-button"
                    style={{ width: "34px", height: "34px", padding: 0, display: "grid", placeItems: "center", minWidth: "34px" }}
                    onClick={() => flash("Job bookmarked!")}
                  >
                    <Bookmark size={14} />
                  </button>
                  <button
                    type="button"
                    aria-label="Share"
                    className="secondary-button"
                    style={{ width: "34px", height: "34px", padding: 0, display: "grid", placeItems: "center", minWidth: "34px" }}
                    onClick={() => flash("Job link copied!")}
                  >
                    <Share2 size={14} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
