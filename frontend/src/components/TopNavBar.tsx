"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "./AuthProvider";
import { supabase } from "@/lib/supabaseClient";
import { getUnreadNotificationCount } from "@/services/notifications";

export default function TopNavBar() {
  const { user, role, signOut } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  // Extract name for Avatar
  const fullName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";
  const initial = fullName.charAt(0).toUpperCase();

  const glassTabClass =
    "flex items-center text-on-surface-variant hover:text-on-surface font-label-md text-label-md backdrop-blur-md bg-[#E2DFD0]/10 hover:bg-[#E2DFD0]/30 border border-[#E2DFD0]/30 rounded-full px-5 py-2 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_4px_15px_rgba(226,223,208,0.2)]";

  const fetchUnread = async () => {
    if (!user) return;
    try {
      const count = await getUnreadNotificationCount(user.id);
      setUnreadCount(count);
    } catch (err) {
      console.error("Failed to fetch unread notification count:", err);
    }
  };

  useEffect(() => {
    fetchUnread();
  }, [user]);

  // Realtime subscription for unread notifications count
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`top-nav-notifications-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchUnread();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return (
    <nav className="bg-surface/60 backdrop-blur-xl border-b border-white/10 dark:border-white/5 w-full sticky top-0 z-50 shadow-sm">
      <div className="flex justify-between items-center w-full px-margin-mobile md:px-margin-desktop h-16 max-w-[1440px] mx-auto">
        <Link href="/" className="flex items-center gap-xs">
          <span className="material-symbols-outlined text-primary text-3xl icon-fill">assured_workload</span>
          <span className="font-headline-md text-headline-md font-bold text-primary tracking-tight">CivicPulse</span>
        </Link>
        
        <div className="hidden md:flex gap-4 items-center">
          {role === 'admin' ? (
            <>
              <Link href="/map" className={glassTabClass}>
                Map
              </Link>
              <Link href="/approvals" className={glassTabClass}>
                Approvals
              </Link>
            </>
          ) : (
            <>
              <Link href="/" className={glassTabClass}>
                Dashboard
              </Link>
              <Link href="/map" className={glassTabClass}>
                Map
              </Link>
              {user && (
                <Link href="/my-reports" className={glassTabClass}>
                  My Reports
                </Link>
              )}
            </>
          )}
        </div>
        
        <div className="flex items-center gap-md">
          {user ? (
            <>
              {role === 'admin' && (
                <span className="hidden md:inline-block bg-error text-on-error px-sm py-1 rounded text-xs font-bold uppercase">Admin</span>
              )}
              {role !== 'admin' && (
                <button 
                  onClick={() => window.dispatchEvent(new Event('open-new-report'))}
                  className="hidden md:flex items-center gap-sm bg-primary hover:bg-primary-fixed-dim text-on-primary font-label-md text-label-md px-md py-sm rounded-full transition-colors duration-200"
                >
                  <span className="material-symbols-outlined">add</span>
                  New Report
                </button>
              )}
              <div className="flex gap-sm items-center border-l border-outline-variant pl-md ml-sm">
                
                {/* Notifications Link */}
                <Link
                  href="/notifications"
                  className="relative p-2 text-on-surface-variant hover:text-primary transition-colors rounded-full hover:bg-surface-variant/40"
                  title="Notifications"
                >
                  <span className="material-symbols-outlined text-2xl">notifications</span>
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 bg-error text-on-error text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </Link>

                {/* User Avatar */}
                <div className="flex items-center gap-xs mr-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold text-sm">
                    {initial}
                  </div>
                  <span className="hidden lg:block text-sm font-label-md text-on-surface truncate max-w-[120px]">
                    {fullName}
                  </span>
                </div>

                <button 
                  onClick={signOut}
                  className="flex items-center justify-center text-on-surface-variant hover:text-error transition-colors duration-200 px-sm py-sm rounded-lg hover:bg-error/10 font-label-md text-sm"
                >
                  <span className="material-symbols-outlined mr-1 text-[18px]">logout</span>
                  Sign Out
                </button>
              </div>
            </>
          ) : (
            <div className="flex gap-sm">
              <Link href="/auth/login" className="flex items-center justify-center text-primary font-label-md hover:bg-primary/10 transition-colors duration-200 px-md py-sm rounded-full">
                Log In
              </Link>
              <Link href="/auth/register" className="flex items-center justify-center bg-primary text-on-primary font-label-md hover:bg-primary/90 transition-colors duration-200 px-md py-sm rounded-full shadow-sm">
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
