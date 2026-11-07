"use client";

import { useEffect, useRef, useState } from "react";
import { ShieldCheck } from "lucide-react";

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

type GoogleId = {
  initialize: (config: { client_id: string; callback: (response: { credential: string }) => void; hd?: string }) => void;
  renderButton: (element: HTMLElement, options: Record<string, unknown>) => void;
};
declare global {
  interface Window {
    google?: { accounts: { id: GoogleId } };
  }
}

function loadGoogleScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve();
    const existing = document.querySelector<HTMLScriptElement>("script[data-google-gsi]");
    if (existing) {
      existing.addEventListener("load", () => resolve());
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.dataset.googleGsi = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load Google sign-in"));
    document.head.appendChild(script);
  });
}

export function LoginScreen({ loading, onGoogleCredential }: {
  loading: boolean;
  onGoogleCredential: (credential: string) => void | Promise<void>;
}) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const callbackRef = useRef(onGoogleCredential);
  callbackRef.current = onGoogleCredential;
  const [error, setError] = useState("");

  useEffect(() => {
    if (!CLIENT_ID) return;
    let cancelled = false;
    loadGoogleScript()
      .then(() => {
        if (cancelled || !buttonRef.current || !window.google) return;
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: async ({ credential }) => {
            setError("");
            try {
              await callbackRef.current(credential);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Sign-in failed");
            }
          }
        });
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: "outline",
          size: "large",
          shape: "pill",
          text: "continue_with",
          width: Math.max(200, Math.min(340, Math.floor(buttonRef.current.clientWidth || 340)))
        });
      })
      .catch((err: Error) => setError(err.message));
    return () => { cancelled = true; };
  }, []);

  return (
    <main className="app light login-app">
      <div className="auth-shell">
        <section className="auth-hero">
          <div className="auth-brand auth-brand-logo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/kkw-society.png" alt="Karmaveer Kakasaheb Wagh Education Society" className="brand-society" width={68} height={40} />
            <span className="brand-divider" aria-hidden="true" />
            <span className="brand-word">Place<mark>Track</mark></span>
          </div>
          <div>
            <span className="auth-tag">Placement management</span>
            <h1>Your placement season, <mark>organised.</mark></h1>
            <p>Track applications, practise aptitude and interviews, and get your resume reviewed in one place.</p>
          </div>
          <span className="auth-foot">
            Trusted by engineering colleges · <a href="/privacy">Privacy</a> · <a href="/terms">Terms</a>
          </span>
        </section>

        <section className="auth-card">
          <h2>Sign in</h2>
          <p className="auth-sub">Sign in with your Google account.</p>
          <p className="auth-college-note">Sign in only with your KKWagh college email ID.</p>

          {CLIENT_ID ? (
            <div className="auth-google" ref={buttonRef} aria-busy={loading} />
          ) : (
            <p className="auth-error" role="alert">Google sign-in is not configured. Set NEXT_PUBLIC_GOOGLE_CLIENT_ID.</p>
          )}
          {error && <p className="auth-error" role="alert">{error}</p>}

          <ul className="auth-notes">
            <li><ShieldCheck size={15} /> Only verified Google emails can sign in. There are no passwords.</li>
            <li><ShieldCheck size={15} /> Training &amp; Placement Coordinators are invited by the administrator for their department.</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
