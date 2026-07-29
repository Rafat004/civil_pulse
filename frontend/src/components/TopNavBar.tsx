"use client";

import Link from 'next/link';
import { useAuth } from './AuthProvider';

export default function TopNavBar() {
  const { user, role, signOut } = useAuth();

  return (
    <nav className="bg-surface border-b border-outline-variant w-full sticky top-0 z-50">
      <div className="flex justify-between items-center w-full px-margin-mobile md:px-margin-desktop h-16 max-w-[1440px] mx-auto">
        <div className="flex items-center gap-xs">
          <span className="material-symbols-outlined text-primary text-3xl icon-fill">assured_workload</span>
          <span className="font-headline-md text-headline-md font-bold text-primary tracking-tight">CivicPulse</span>
        </div>
        
        <div className="hidden md:flex gap-lg items-center h-full">
          {role === 'admin' ? (
            <>
              <Link href="/map" className="h-full flex items-center text-on-surface-variant font-label-md text-label-md hover:text-primary transition-colors duration-200">
                Map
              </Link>
              <Link href="/approvals" className="h-full flex items-center text-on-surface-variant font-label-md text-label-md hover:text-primary transition-colors duration-200">
                Approvals
              </Link>
            </>
          ) : (
            <>
              <Link href="/" className="h-full flex items-center text-on-surface-variant font-label-md text-label-md hover:text-primary transition-colors duration-200">
                Dashboard
              </Link>
              <Link href="/map" className="h-full flex items-center text-on-surface-variant font-label-md text-label-md hover:text-primary transition-colors duration-200">
                Map
              </Link>
              {user && (
                <Link href="/my-reports" className="h-full flex items-center text-on-surface-variant font-label-md text-label-md hover:text-primary transition-colors duration-200">
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
