import { useState, useMemo } from "react";
import { X, Search } from "lucide-react";

const SKILLS_BY_CATEGORY: Record<string, string[]> = {
  "Technical Core": [
    "JavaScript", "TypeScript", "Python", "Java", "C", "C++", "C#", "Go", "Rust", "PHP",
    "React", "Next.js", "Angular", "Vue.js", "Node.js", "Express", "Django", "Flask",
    "Spring Boot", "FastAPI", "GraphQL", "REST API", "WebSockets"
  ],
  "Tools & Platforms": [
    "SQL", "PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch",
    "AWS", "Azure", "GCP", "Docker", "Kubernetes", "Linux", "Git", "CI/CD",
    "Jenkins", "Terraform", "Kafka", "Microservices", "Data Structures",
    "Algorithms", "Machine Learning", "Deep Learning", "TensorFlow", "PyTorch",
    "Data Analysis", "System Design", "OOPS"
  ],
  "Core Engineering": [
    "AutoCAD", "SolidWorks", "CATIA", "ANSYS", "Fusion 360",
    "MATLAB", "Simulink", "PLC Programming", "SCADA", "Embedded C",
    "VHDL / Verilog", "PCB Design", "Arduino", "Raspberry Pi", "LabVIEW",
    "STAAD Pro", "Revit", "ETABS", "Primavera P6", "GIS",
    "CNC Programming", "Six Sigma", "Lean Manufacturing", "Thermodynamics", "Fluid Mechanics",
    "Power Systems", "Circuit Design", "Process Simulation", "P&ID", "GD&T"
  ],
  "Soft Skills": [
    "Communication", "Teamwork", "Leadership", "Problem Solving", "Critical Thinking",
    "Time Management", "Adaptability", "Presentation", "Project Management", "Agile / Scrum"
  ]
};

export default function SkillsSelector({
  selected,
  onChange
}: {
  selected: string[];
  onChange: (skills: string[]) => void;
}) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const toggleSkill = (skill: string) => {
    if (selected.includes(skill)) {
      onChange(selected.filter((s) => s !== skill));
    } else {
      onChange([...selected, skill]);
    }
  };

  const filteredCategories = useMemo(() => {
    const query = search.toLowerCase().trim();
    if (!query) return Object.entries(SKILLS_BY_CATEGORY);

    return Object.entries(SKILLS_BY_CATEGORY)
      .map(([category, skills]) => {
        const matchingSkills = skills.filter((skill) =>
          skill.toLowerCase().includes(query)
        );
        return [category, matchingSkills] as [string, string[]];
      })
      .filter(([_, skills]) => skills.length > 0);
  }, [search]);

  return (
    <div className="skills-selector" style={{ position: "relative", display: "grid", gap: "8px" }}>
      <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text)" }}>
        Skills & Core Competencies
      </label>

      {/* Selected Skills Badges/Chips Container */}
      {selected.length > 0 && (
        <div className="skills-tags" style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "4px" }}>
          {selected.map((skill) => (
            <span
              key={skill}
              className="skill-tag active"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "4px 10px",
                fontSize: "12px",
                borderRadius: "6px",
                background: "var(--primary)",
                color: "var(--bg)",
                fontWeight: 600
              }}
            >
              {skill}
              <button
                type="button"
                onClick={() => toggleSkill(skill)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "currentColor",
                  cursor: "pointer",
                  display: "inline-flex",
                  padding: 0
                }}
                aria-label={`Remove ${skill}`}
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search Bar Input Container */}
      <div style={{ position: "relative" }}>
        <div className="search" style={{ width: "100%", background: "var(--panel-2)", border: "1px solid var(--line)", borderRadius: "10px", paddingLeft: "12px" }}>
          <Search size={16} style={{ color: "var(--muted)" }} />
          <input
            type="text"
            placeholder="Type to search and filter skills..."
            value={search}
            onFocus={() => setIsOpen(true)}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: "100%", padding: "12px 8px", background: "transparent", border: "none", outline: "none", fontSize: "13px", color: "var(--text)" }}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              style={{ background: "transparent", border: "none", color: "var(--muted)", marginRight: "8px", cursor: "pointer" }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Dropdown Options List Menu */}
        {isOpen && (
          <>
            {/* Click outside backdrop scrim to close the dropdown */}
            <div
              onClick={() => setIsOpen(false)}
              style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 40 }}
            />

            <div
              className="card"
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                marginTop: "6px",
                maxHeight: "260px",
                overflowY: "auto",
                zIndex: 50,
                padding: "12px",
                background: "var(--panel)",
                border: "1px solid var(--line)",
                borderRadius: "12px",
                boxShadow: "0 10px 25px rgba(0,0,0,0.3)"
              }}
            >
              {filteredCategories.length === 0 ? (
                <p style={{ fontSize: "12px", color: "var(--muted)", textAlign: "center", margin: "12px 0" }}>
                  No matching skills found
                </p>
              ) : (
                filteredCategories.map(([category, skills]) => (
                  <div key={category} style={{ marginBottom: "10px" }}>
                    <p style={{ fontSize: "10px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", margin: "4px 0 6px" }}>
                      {category}
                    </p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                      {skills.map((skill) => {
                        const active = selected.includes(skill);
                        return (
                          <button
                            key={skill}
                            type="button"
                            className={active ? "skill-tag active" : "skill-tag"}
                            onClick={() => toggleSkill(skill)}
                            style={{
                              padding: "4px 8px",
                              fontSize: "12px",
                              borderRadius: "6px",
                              border: active ? "1px solid var(--violet)" : "1px solid var(--line)",
                              background: active ? "rgba(136, 189, 242, 0.15)" : "var(--panel-2)",
                              color: active ? "var(--secondary)" : "var(--text)",
                              cursor: "pointer"
                            }}
                          >
                            {skill} {active && "✓"}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
