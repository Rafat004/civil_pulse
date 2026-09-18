"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell, ClipboardCheck, LayoutDashboard, LogOut, Map, Plus, ShieldCheck } from "lucide-react";
import { usePathname } from "next/navigation";
import { useAuth } from "./AuthProvider";
import { supabase } from "@/lib/supabaseClient";
import { getUnreadNotificationCount } from "@/services/notifications";
import { Button, IconButton } from "./ui";

export default function TopNavBar() {
  const { user, role, signOut } = useAuth();
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const fullName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";
  const initial = fullName.charAt(0).toUpperCase();

  const fetchUnread = useCallback(async () => {
    if (!user) return;
    try {
      setUnreadCount(await getUnreadNotificationCount(user.id));
    } catch {
      // The notification badge is non-critical; keep navigation usable.
    }
  }, [user]);

  useEffect(() => {
    void Promise.resolve().then(fetchUnread);
  }, [fetchUnread]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`top-nav-notifications-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, () => void fetchUnread())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchUnread, user]);

  const isActive = (href: string) => href === "/" ? pathname === "/" : pathname.startsWith(href);
  const navClass = (href: string) => `civic-focus inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition-colors ${isActive(href) ? "bg-[#eee8dc] text-primary" : "text-on-surface-variant hover:bg-[#f0eee8] hover:text-primary"}`;

  const handleSignOut = async () => {
    setSignOutError(null);
    try {
      await signOut();
    } catch (error) {
      setSignOutError(error instanceof Error ? error.message : "Unable to sign out. Please try again.");
    }
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-[#d8d6cf]/80 bg-[#f5f3ee]/95 backdrop-blur-xl">
      <div className="civic-container flex min-h-[72px] items-center justify-between gap-4">
        <Link href="/" className="civic-focus inline-flex items-center gap-3 rounded-lg" aria-label="CivicPulse home">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-white shadow-[0_8px_18px_rgba(23,50,74,0.18)]">
            <ShieldCheck size={21} strokeWidth={2.2} />
          </span>
          <span className="font-headline-md text-headline-md font-extrabold tracking-[-0.045em] text-primary">CivicPulse</span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {role === "admin" ? (
            <>
              <Link href="/approvals" className={navClass("/approvals")} aria-current={isActive("/approvals") ? "page" : undefined}><ClipboardCheck size={16} />Operations</Link>
              <Link href="/map" className={navClass("/map")} aria-current={isActive("/map") ? "page" : undefined}><Map size={16} />Map</Link>
            </>
          ) : (
            <>
              <Link href="/" className={navClass("/")} aria-current={isActive("/") ? "page" : undefined}><LayoutDashboard size={16} />Discover</Link>
              <Link href="/map" className={navClass("/map")} aria-current={isActive("/map") ? "page" : undefined}><Map size={16} />Map</Link>
              {user && <Link href="/my-reports" className={navClass("/my-reports")} aria-current={isActive("/my-reports") ? "page" : undefined}><ClipboardCheck size={16} />My reports</Link>}
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              {role !== "admin" && <Button size="sm" className="hidden sm:inline-flex" onClick={() => window.dispatchEvent(new Event("open-new-report"))}><Plus size={16} />Report an issue</Button>}
              {role === "admin" && <span className="hidden items-center gap-1.5 rounded-full border border-[#efc3c0] bg-[#fff1ef] px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#9a3d38] sm:inline-flex"><ShieldCheck size={14} />Admin</span>}
              <Link href="/notifications" className="civic-focus relative inline-flex h-10 w-10 items-center justify-center rounded-xl text-on-surface-variant hover:bg-[#ece9e1] hover:text-primary" aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}>
                <Bell size={18} />
                {unreadCount > 0 && <span className="absolute right-0.5 top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-[#a13a32] px-1 text-[9px] font-extrabold text-white">{unreadCount > 9 ? "9+" : unreadCount}</span>}
              </Link>
              <div className="hidden items-center gap-2 border-l border-[#d8d6cf] pl-3 lg:flex">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-[#eee8dc] text-sm font-extrabold text-primary">{initial}</span>
                <span className="max-w-[120px] truncate text-sm font-bold text-on-surface">{fullName}</span>
              </div>
              <IconButton label="Sign out" onClick={() => void handleSignOut()}><LogOut size={17} /></IconButton>
            </>
          ) : (
            <div className="flex items-center gap-1">
              <Link href="/auth/login" className="civic-focus rounded-lg px-3 py-2 text-sm font-bold text-primary hover:bg-[#eee8dc]">Sign in</Link>
              <Link href="/auth/register" className="inline-flex min-h-10 items-center rounded-xl bg-primary px-4 text-sm font-bold text-white shadow-[0_8px_18px_rgba(23,50,74,0.16)] hover:bg-primary/90">Create account</Link>
            </div>
          )}
        </div>
      </div>
      {signOutError && <p role="alert" className="border-t border-[#efc3c0] bg-[#fff1ef] px-4 py-2 text-center text-xs text-[#9a3d38]">{signOutError}</p>}
    </nav>
  );
}
