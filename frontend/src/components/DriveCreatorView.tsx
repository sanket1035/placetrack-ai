import { useState } from "react";
import { Plus } from "lucide-react";
import { api } from "@/lib/api";
import PageTitle from "./PageTitle";

const AVAILABLE_DEPARTMENTS = [
  "Computer Engineering",
  "Information Technology",
  "AI & Data Science",
  "E&TC",
  "Electrical",
  "Mechanical",
  "Civil"
];

export function DriveCreator({
  token,
  flash,
  onCreated
}: {
  token: string;
  flash: (message: string) => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    company: "Cognizant",
    role: "Graduate Trainee",
    package: "2.9",
    location: "Pune",
    minCgpa: "6.5",
    deadline: new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10)
  });
  const [allowedBranches, setAllowedBranches] = useState<string[]>(["Computer Engineering", "Information Technology"]);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ["image/jpeg", "image/png", "image/jpg"];
    if (!allowed.includes(file.type)) {
      flash("Only JPEG/PNG images are allowed");
      e.target.value = "";
      setLogoFile(null);
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      flash("Image size must be less than 2 MB");
      e.target.value = "";
      setLogoFile(null);
      return;
    }

    setLogoFile(file);
  };

  const create = async () => {
    try {
      const drive = await api<any>("/api/drives", token, {
        method: "POST",
        body: JSON.stringify({
          company: { name: form.company, description: `${form.company} campus hiring partner.` },
          role: form.role,
          package: Number(form.package),
          location: form.location,
          jobType: "Full-time",
          description: "Campus hiring drive created from coordinator dashboard.",
          minCgpa: Number(form.minCgpa),
          allowedBranches: allowedBranches,
          maxBacklogs: 1,
          graduationYear: 2027,
          deadline: form.deadline,
          status: "OPEN"
        })
      });

      if (logoFile && drive?.company?.id) {
        const formData = new FormData();
        formData.append("logo", logoFile);
        await api(`/api/drives/companies/${drive.company.id}/logo`, token, {
          method: "POST",
          body: formData
        });
      }

      flash("Drive created");
      onCreated();
    } catch (error) {
      flash(error instanceof Error ? error.message : "Drive creation failed");
    }
  };

  return (
    <>
      <PageTitle
        eyebrow="Coordinator tools"
        title="Create a new placement drive."
        copy="This posts directly to the backend and appears for eligible students."
      />
      <section className="card form-card">
        <div className="grid-form">
          <label>Company<input value={form.company} onChange={(e) => setForm(old => ({ ...old, company: e.target.value }))} /></label>
          <label>Role<input value={form.role} onChange={(e) => setForm(old => ({ ...old, role: e.target.value }))} /></label>
          <label>Package (LPA)<input value={form.package} onChange={(e) => setForm(old => ({ ...old, package: e.target.value }))} /></label>
          <label>Location<input value={form.location} onChange={(e) => setForm(old => ({ ...old, location: e.target.value }))} /></label>
          <label>Min CGPA<input value={form.minCgpa} onChange={(e) => setForm(old => ({ ...old, minCgpa: e.target.value }))} /></label>
          <label>Deadline<input value={form.deadline} type="date" onChange={(e) => setForm(old => ({ ...old, deadline: e.target.value }))} /></label>
          <label>
            Company Logo (JPEG/PNG, Max 2MB)
            <input
              type="file"
              accept="image/png, image/jpeg, image/jpg"
              onChange={handleFileChange}
              style={{
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px dashed rgba(255, 255, 255, 0.1)",
                padding: "8px",
                borderRadius: "8px",
                cursor: "pointer",
                width: "100%",
                boxSizing: "border-box"
              }}
            />
          </label>
        </div>
        {logoFile && (
          <div style={{ marginTop: "12px", display: "flex", alignItems: "center", gap: "10px" }}>
            <img
              src={URL.createObjectURL(logoFile)}
              alt="Logo preview"
              style={{ width: "40px", height: "40px", borderRadius: "8px", objectFit: "cover", border: "1px solid rgba(255,255,255,0.1)" }}
            />
            <span style={{ fontSize: "12px", color: "var(--success)" }}>Logo selected</span>
          </div>
        )}
        <div style={{ marginTop: "14px", display: "grid", gap: "8px" }}>
          <span style={{ fontSize: "10px", color: "var(--muted)", fontWeight: 800, textTransform: "uppercase", letterSpacing: ".11em" }}>Allowed Branches</span>
          <div className="branch-checkbox-grid">
            {AVAILABLE_DEPARTMENTS.map((dept) => {
              const checked = allowedBranches.includes(dept);
              return (
                <label key={dept} className="branch-checkbox-label">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      if (checked) {
                        setAllowedBranches(allowedBranches.filter((b) => b !== dept));
                      } else {
                        setAllowedBranches([...allowedBranches, dept]);
                      }
                    }}
                  />
                  {dept}
                </label>
              );
            })}
          </div>
        </div>
        <button className="primary-button" style={{ marginTop: "20px" }} onClick={create}>
          <Plus size={16} /> Create drive
        </button>
      </section>
    </>
  );
}
