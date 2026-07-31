"use client";

import Link from 'next/link';
import { useAuth } from './AuthProvider';

export default function TopNavBar() {
  const { user, role, signOut } = useAuth();

  // Extract name for Avatar
  const fullName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const initial = fullName.charAt(0).toUpperCase();

  const glassTabClass = "flex items-center text-on-surface-variant hover:text-on-surface font-label-md text-label-md backdrop-blur-md bg-[#E2DFD0]/10 hover:bg-[#E2DFD0]/30 border border-[#E2DFD0]/30 rounded-full px-5 py-2 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_4px_15px_rgba(226,223,208,0.2)]";

  return (
    <nav className="bg-surface/60 backdrop-blur-xl border-b border-white/10 dark:border-white/5 w-full sticky top-0 z-50 shadow-sm">
      <div className="flex justify-between items-center w-full px-margin-mobile md:px-margin-desktop h-16 max-w-[1440px] mx-auto">
        <div className="flex items-center gap-xs">
          <span className="material-symbols-outlined text-primary text-3xl icon-fill">assured_workload</span>
          <span className="font-headline-md text-headline-md font-bold text-primary tracking-tight">CivicPulse</span>
        </div>
        
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
