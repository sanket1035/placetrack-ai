"use client";

import { useEffect, useState } from "react";
import { Dashboard } from "./Dashboard";
import { Landing } from "./Landing";

/** Signed-in visitors go straight to their dashboard; everyone else sees the public landing page. */
export function HomeGate() {
  const [mode, setMode] = useState<"checking" | "landing" | "app">("checking");
  useEffect(() => {
    let signedIn = false;
    try { signedIn = Boolean(window.localStorage.getItem("placetrack-token")); } catch { /* storage blocked */ }
    setMode(signedIn ? "app" : "landing");
  }, []);
  if (mode === "checking") return <div style={{ minHeight: "100vh", background: "#FBFAF4" }} />;
  return mode === "app" ? <Dashboard /> : <Landing />;
}
