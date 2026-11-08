"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, BriefcaseBusiness, CalendarDays, CheckCheck, Sparkles } from "lucide-react";
import { Notification } from "../hooks/useNotifications";

interface NotificationBellProps {
  notifications: Notification[];
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  onNavigate: (view: any) => void;
}

export function NotificationBell({ notifications, markAsRead, markAllAsRead, onNavigate }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const recentNotifications = notifications.slice(0, 10);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getNotificationIcon = (title: string) => {
    const t = title.toLowerCase();
    if (t.includes("interview")) return <CalendarDays size={14} style={{ color: "var(--text, #1B3A0A)" }} />;
    if (t.includes("eligible") || t.includes("drive")) return <Sparkles size={14} style={{ color: "var(--text, #1B3A0A)" }} />;
    return <BriefcaseBusiness size={14} style={{ color: "var(--text, #1B3A0A)" }} />;
  };

  const handleNotificationClick = async (notif: Notification) => {
    if (!notif.isRead) {
      await markAsRead(notif.id);
    }
    setIsOpen(false);

    // Map title/message to corresponding views
    const t = notif.title.toLowerCase();
    if (t.includes("interview")) {
      onNavigate("Interview");
    } else if (t.includes("eligible") || t.includes("drive")) {
      onNavigate("Opportunities");
    } else if (t.includes("application")) {
      onNavigate("Applications");
    }
  };

  const getRelativeTimeString = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    } catch {
      return "";
    }
  };

  return (
    <div ref={containerRef} style={{ position: "relative", display: "inline-block" }}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        type="button"
        aria-label="Notifications"
        style={{
          position: "relative",
          width: "38px",
          height: "38px",
          borderRadius: "50%",
          background: "var(--panel-2, rgba(255, 255, 255, 0.05))",
          border: "1px solid var(--line, rgba(255, 255, 255, 0.1))",
          color: isOpen ? "var(--text)" : "var(--muted)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          transition: "all 0.2s ease"
        }}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: "2px",
              right: "2px",
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "var(--error, #EF4444)",
              border: "1.5px solid var(--bg, #FBFAF4)",
              display: "block"
            }}
          />
        )}
      </button>

      {/* Dropdown Container */}
      {isOpen && (
        <div
          className="card"
          style={{
            position: "absolute",
            top: "calc(100% + 10px)",
            right: 0,
            width: "min(340px, calc(100vw - 80px))",
            maxHeight: "440px",
            background: "var(--panel, #FFFEF9)",
            border: "1.5px solid var(--line, #1B3A0A)",
            borderRadius: "16px",
            boxShadow: "0 14px 32px rgba(27, 58, 10, 0.18)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            zIndex: 999
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "6px 12px",
              padding: "14px 16px",
              background: "var(--panel-2, #F3F2E8)",
              borderBottom: "1px solid var(--line-dim, rgba(27, 58, 10, 0.16))"
            }}
          >
            <div>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text, #1B3A0A)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Notifications
              </span>
              {unreadCount > 0 && (
                <span style={{ fontSize: "12px", color: "var(--muted)", marginLeft: "6px" }}>
                  ({unreadCount} unread)
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                type="button"
                style={{
                  background: "transparent",
                  border: 0,
                  color: "var(--text, #1B3A0A)",
                  fontSize: "12px",
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                  textDecoration: "underline",
                  width: "auto",
                  minWidth: 0,
                  minHeight: 0,
                  height: "auto",
                  padding: "4px 0",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  cursor: "pointer"
                }}
              >
                <CheckCheck size={12} /> Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {recentNotifications.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {recentNotifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    style={{
                      display: "flex",
                      gap: "12px",
                      padding: "12px 16px",
                      borderBottom: "1px solid var(--line-dim, rgba(27, 58, 10, 0.16))",
                      cursor: "pointer",
                      background: notif.isRead ? "transparent" : "rgba(255, 232, 89, 0.3)",
                      transition: "background 0.2s ease"
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover, rgba(27, 58, 10, 0.06))")}
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = notif.isRead ? "transparent" : "rgba(255, 232, 89, 0.3)")
                    }
                  >
                    {/* Icon block */}
                    <div
                      style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "8px",
                        background: "var(--mint, #D6F5C6)",
                        border: "1px solid var(--line-dim, rgba(27, 58, 10, 0.16))",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0
                      }}
                    >
                      {getNotificationIcon(notif.title)}
                    </div>
                    {/* Message block */}
                    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "2px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                        <span style={{ fontSize: "13px", fontWeight: notif.isRead ? 600 : 700, color: "var(--text, #1B3A0A)" }}>
                          {notif.title}
                        </span>
                        <span style={{ fontSize: "11px", color: "var(--muted)", flexShrink: 0, marginLeft: "8px" }}>
                          {getRelativeTimeString(notif.createdAt)}
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: "12px", lineHeight: 1.4, color: "var(--text-dim, #3C5230)", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                        {notif.message}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--muted)" }}>
                <Bell size={24} style={{ opacity: 0.15, marginBottom: "8px" }} />
                <p style={{ margin: 0, fontSize: "12px" }}>No notifications yet</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
