"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabaseClient";
import {
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "@/services/notifications";
import type { Notification, NotificationType } from "@/lib/types";

export default function NotificationsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchNotificationsData = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getNotifications(user.id);
      setNotifications(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login");
      return;
    }

    if (user) {
      void Promise.resolve().then(fetchNotificationsData);
    }
  }, [user, authLoading, router, fetchNotificationsData]);

  // Realtime subscription for notifications
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`user-notifications-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          void fetchNotificationsData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchNotificationsData]);

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setActionError(null);
    try {
      await markNotificationAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
      );
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to mark the notification as read.");
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user) return;
    setActionError(null);
    try {
      await markAllNotificationsAsRead(user.id);
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
      );
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to mark all notifications as read.");
    }
  };

  const getIconForType = (type: NotificationType) => {
    switch (type) {
      case "REPORT_RESOLVED":
        return { icon: "task_alt", color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" };
      case "REPORT_REOPENED":
        return { icon: "restart_alt", color: "text-orange-500 bg-orange-500/10 border-orange-500/20" };
      case "OFFICIAL_UPDATE":
        return { icon: "verified", color: "text-purple-500 bg-purple-500/10 border-purple-500/20" };
      case "NEW_COMMENT":
        return { icon: "chat", color: "text-amber-500 bg-amber-500/10 border-amber-500/20" };
      case "STATUS_CHANGED":
      default:
        return { icon: "sync_alt", color: "text-primary bg-primary/10 border-primary/20" };
    }
  };

  if (authLoading || loading) {
    return (
      <main className="min-h-screen bg-background p-md md:p-xl flex items-center justify-center">
        <div className="flex items-center gap-3 text-on-surface-variant">
          <span className="material-symbols-outlined animate-spin text-2xl">sync</span>
          <span className="font-label-md">Loading notifications...</span>
        </div>
      </main>
    );
  }

  if (!user) return null;

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  return (
    <main className="min-h-screen bg-background p-margin-mobile md:p-margin-desktop py-lg">
      <div className="max-w-[900px] mx-auto flex flex-col gap-lg">
        {/* Page Header */}
        <div className="flex flex-wrap items-center justify-between gap-md border-b border-outline-variant pb-md">
          <div>
            <h1 className="text-headline-lg font-headline-lg text-on-surface font-extrabold flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">notifications</span>
              Notifications
            </h1>
            <p className="text-body-md text-on-surface-variant mt-1">
              Updates on reports you follow and reported issues.
            </p>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-on-primary font-label-md text-xs font-semibold px-4 py-2 rounded-xl transition-all flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">done_all</span>
              Mark all as read ({unreadCount})
            </button>
          )}
        </div>

        {actionError && (
          <div role="alert" className="bg-error/10 border border-error/20 p-sm rounded-xl text-error text-sm">
            {actionError}
          </div>
        )}

        {/* Notifications List */}
        {error ? (
          <div className="bg-error/10 border border-error/20 p-md rounded-2xl text-error text-center font-body-md">
            {error}
          </div>
        ) : notifications.length === 0 ? (
          <div className="glass-card bg-surface/40 border border-outline-variant/60 rounded-2xl p-xl text-center flex flex-col items-center gap-sm">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant">notifications_off</span>
            <h3 className="font-headline-md text-on-surface font-bold">No notifications yet</h3>
            <p className="text-on-surface-variant text-sm max-w-md">
              You will receive updates when there are status changes or new activity on issues you follow.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-sm">
            {notifications.map((notification) => {
              const isUnread = !notification.read_at;
              const { icon, color } = getIconForType(notification.type);

              return (
                <div
                  key={notification.id}
                  onClick={() => {
                    if (isUnread) handleMarkAsRead(notification.id);
                    router.push(`/issues/${notification.report_id}`);
                  }}
                  className={`glass-card p-md rounded-2xl border transition-all cursor-pointer flex items-start gap-md hover:border-primary/40 ${
                    isUnread
                      ? "bg-surface border-primary/30 shadow-sm"
                      : "bg-surface/40 border-outline-variant/40 opacity-80"
                  }`}
                >
                  {/* Type Icon */}
                  <div className={`p-2.5 rounded-xl border flex-shrink-0 ${color}`}>
                    <span className="material-symbols-outlined text-xl">{icon}</span>
                  </div>

                  {/* Content */}
                  <div className="flex-grow flex flex-col gap-xs">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-label-md text-sm font-bold text-on-surface">
                          {notification.title}
                        </h3>
                        {isUnread && (
                          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                        )}
                      </div>
                      <span className="text-[11px] text-on-surface-variant">
                        {new Date(notification.created_at).toLocaleDateString()}{" "}
                        {new Date(notification.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      {notification.message}
                    </p>

                    <div className="flex items-center justify-between gap-2 mt-xs pt-xs border-t border-outline-variant/30">
                      <Link
                        href={`/issues/${notification.report_id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs text-primary hover:underline font-semibold flex items-center gap-1"
                      >
                        View Issue Details
                        <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                      </Link>

                      {isUnread && (
                        <button
                          onClick={(e) => handleMarkAsRead(notification.id, e)}
                          className="text-[11px] text-on-surface-variant hover:text-on-surface transition-colors flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[14px]">check</span>
                          Mark read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
