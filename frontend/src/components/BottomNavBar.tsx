"use client";

import Link from "next/link";
import { ClipboardCheck, LayoutDashboard, Map, Plus } from "lucide-react";
import { usePathname } from "next/navigation";
import { useAuth } from "./AuthProvider";

export default function BottomNavBar() {
  const { user, role } = useAuth();
  const pathname = usePathname();
  const navClass = (href: string) => `civic-focus flex min-w-16 flex-col items-center gap-1 rounded-xl px-2 py-2 text-[10px] font-extrabold transition-colors ${href === pathname || (href !== "/" && pathname.startsWith(href)) ? "text-primary" : "text-on-surface-variant"}`;

  return (
    <>
      <nav className="fixed bottom-0 z-50 flex h-[72px] w-full items-center justify-around border-t border-[#d8d6cf] bg-[#fffefa]/95 px-3 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(23,37,53,0.08)] backdrop-blur-xl md:hidden" aria-label="Mobile navigation">
        {role === "admin" ? (
          <>
            <Link href="/approvals" className={navClass("/approvals")} aria-current={pathname.startsWith("/approvals") ? "page" : undefined}><ClipboardCheck size={19} /><span>Operations</span></Link>
            <Link href="/map" className={navClass("/map")} aria-current={pathname.startsWith("/map") ? "page" : undefined}><Map size={19} /><span>Map</span></Link>
          </>
        ) : (
          <>
            <Link href="/" className={navClass("/")} aria-current={pathname === "/" ? "page" : undefined}><LayoutDashboard size={19} /><span>Discover</span></Link>
            <Link href="/map" className={navClass("/map")} aria-current={pathname.startsWith("/map") ? "page" : undefined}><Map size={19} /><span>Map</span></Link>
            {user && <Link href="/my-reports" className={navClass("/my-reports")} aria-current={pathname.startsWith("/my-reports") ? "page" : undefined}><ClipboardCheck size={19} /><span>My reports</span></Link>}
          </>
        )}
      </nav>
      <div className="h-[72px] md:hidden" />
      {user && role !== "admin" && (
        <button type="button" aria-label="Create a new report" onClick={() => window.dispatchEvent(new Event("open-new-report"))} className="civic-focus fixed bottom-[92px] right-5 z-40 grid h-14 w-14 place-items-center rounded-2xl bg-primary text-white shadow-[0_12px_24px_rgba(23,50,74,0.25)] transition-transform hover:-translate-y-1 md:hidden">
          <Plus size={25} />
        </button>
      )}
    </>
  );
}
