"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PracticeView from "@/components/PracticeView";

export default function PracticePage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

  const flash = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(""), 3000);
  };

  useEffect(() => {
    const savedToken = typeof window !== "undefined" ? localStorage.getItem("placetrack-token") : null;
    if (!savedToken) {
      router.push("/");
      return;
    }
    setToken(savedToken);
    setLoading(false);
  }, [router]);

  if (loading) {
    return (
      <div style={{ display: "grid", placeItems: "center", minHeight: "100vh", background: "#0B0B12", color: "#FFFFFF", fontFamily: "sans-serif" }}>
        Loading Practice Workspace…
      </div>
    );
  }

  return (
    <main className="app light" style={{ padding: "40px 24px", minHeight: "100vh", position: "relative" }}>
      {notice && (
        <div className="toast" style={{ position: "fixed", top: "20px", left: "50%", transform: "translateX(-50%)", zIndex: 1000 }}>
          {notice}
        </div>
      )}
      <div style={{ maxWidth: "800px", margin: "0 auto", width: "100%", paddingTop: "20px" }}>
        <button
          onClick={() => router.push("/")}
          className="secondary-button"
          style={{ marginBottom: "20px", padding: "8px 14px", borderRadius: "10px", fontSize: "12px" }}
        >
          ← Back to Dashboard
        </button>
        <PracticeView token={token} flash={flash} />
      </div>
    </main>
  );
}
