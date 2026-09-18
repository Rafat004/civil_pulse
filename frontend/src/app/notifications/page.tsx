"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Bell, Check, CheckCheck, CircleAlert, MessageCircle, RefreshCw, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabaseClient";
import {
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "@/services/notifications";
import type { Notification, NotificationType } from "@/lib/types";
import { Button, EmptyState, InlineError, LoadingSkeleton, PageHeader } from "@/components/ui";

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
        return { icon: <CheckCheck size={19} />, color: "text-[#39704a] bg-[#e8f4eb] border-[#b9ddc1]" };
      case "REPORT_REOPENED":
        return { icon: <RefreshCw size={19} />, color: "text-[#8c5a13] bg-[#fff3df] border-[#f2d09a]" };
      case "OFFICIAL_UPDATE":
        return { icon: <ShieldCheck size={19} />, color: "text-[#684d89] bg-[#f0ebf8] border-[#d7c9e7]" };
      case "NEW_COMMENT":
        return { icon: <MessageCircle size={19} />, color: "text-[#8c5a13] bg-[#fff3df] border-[#f2d09a]" };
      case "STATUS_CHANGED":
      default:
        return { icon: <CircleAlert size={19} />, color: "text-[#2c5e86] bg-[#e9f2fb] border-[#bdd6ec]" };
    }
  };

  if (authLoading || loading) {
    return (
      <main className="civic-page"><div className="civic-container py-12"><LoadingSkeleton className="h-24" /><div className="mt-6 grid gap-3"><LoadingSkeleton className="h-24" /><LoadingSkeleton className="h-24" /><LoadingSkeleton className="h-24" /></div></div>
      </main>
    );
  }

  if (!user) return null;

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  return (
    <main className="civic-page pb-12"><div className="civic-container py-10 md:py-14">
        <PageHeader eyebrow="Stay in the loop" title="Notifications" description="Updates on reports you follow and activity that moves civic issues forward." actions={unreadCount > 0 ? <Button variant="secondary" size="sm" onClick={handleMarkAllAsRead}><CheckCheck size={15} />Mark all read ({unreadCount})</Button> : undefined} />

        {actionError && (
          <InlineError>{actionError}</InlineError>
        )}

        {/* Notifications List */}
        {error ? (
          <InlineError>
            {error}
          </InlineError>
        ) : notifications.length === 0 ? (
          <EmptyState icon={<Bell size={34} />} title="No notifications yet" description="You will receive updates when there are status changes or new activity on issues you follow." />
        ) : (
          <div className="flex flex-col gap-3">
            {notifications.map((notification) => {
              const isUnread = !notification.read_at;
              const { icon, color } = getIconForType(notification.type);

              return (
                <div
                  key={notification.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    if (isUnread) handleMarkAsRead(notification.id);
                    router.push(`/issues/${notification.report_id}`);
                  }}
                  onKeyDown={(event) => {
                    if (event.target !== event.currentTarget) return;
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      if (isUnread) handleMarkAsRead(notification.id);
                      router.push(`/issues/${notification.report_id}`);
                    }
                  }}
                  className={`civic-focus civic-surface flex cursor-pointer items-start gap-4 rounded-2xl border p-4 transition-shadow hover:shadow-[0_10px_26px_rgba(23,37,53,0.08)] ${
                    isUnread
                      ? "bg-surface border-primary/30 shadow-sm"
                      : "bg-surface/40 border-outline-variant/40 opacity-80"
                  }`}
                >
                  {/* Type Icon */}
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${color}`}>{icon}</div>

                  {/* Content */}
                  <div className="flex-grow flex flex-col gap-xs">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-label-md text-sm font-bold text-on-surface">
                          {notification.title}
                        </h3>
                        {isUnread && <span className="h-2 w-2 rounded-full bg-[#b87924]" aria-label="Unread" />}
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
                        <ArrowRight size={14} />
                      </Link>

                      {isUnread && (
                        <button
                          onClick={(e) => handleMarkAsRead(notification.id, e)}
                          className="text-[11px] text-on-surface-variant hover:text-on-surface transition-colors flex items-center gap-1"
                        >
                          <Check size={14} />
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
