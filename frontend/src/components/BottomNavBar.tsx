"use client";

import Link from 'next/link';
import { useAuth } from './AuthProvider';

export default function BottomNavBar() {
  const { user, role } = useAuth();

  return (
    <>
      <nav className="md:hidden bg-surface border-t border-outline-variant fixed bottom-0 w-full z-50 px-margin-mobile py-sm flex justify-around items-center h-16">
        {role === 'admin' ? (
          <>
            <Link href="/map" className="flex flex-col items-center gap-1 text-on-surface-variant hover:text-primary transition-colors">
              <span className="material-symbols-outlined">map</span>
              <span className="font-caption text-[10px]">Map</span>
            </Link>
            <Link href="/approvals" className="flex flex-col items-center gap-1 text-on-surface-variant hover:text-primary transition-colors">
              <span className="material-symbols-outlined">checklist</span>
              <span className="font-caption text-[10px]">Approvals</span>
            </Link>
          </>
        ) : (
          <>
            <Link href="/" className="flex flex-col items-center gap-1 text-on-surface-variant hover:text-primary transition-colors">
              <span className="material-symbols-outlined">dashboard</span>
              <span className="font-caption text-[10px]">Dashboard</span>
            </Link>
            <Link href="/map" className="flex flex-col items-center gap-1 text-on-surface-variant hover:text-primary transition-colors">
              <span className="material-symbols-outlined">map</span>
              <span className="font-caption text-[10px]">Map</span>
            </Link>
            {user && (
              <Link href="/my-reports" className="flex flex-col items-center gap-1 text-on-surface-variant hover:text-primary transition-colors">
                <span className="material-symbols-outlined">list_alt</span>
                <span className="font-caption text-[10px]">My Reports</span>
              </Link>
            )}
          </>
        )}
      </nav>
      {/* Padding for mobile bottom nav */}
      <div className="h-16 md:hidden"></div>
      
      {/* Mobile FAB for New Report — only for civic users */}
      {user && role !== 'admin' && (
        <button 
          onClick={() => window.dispatchEvent(new Event('open-new-report'))}
          className="md:hidden fixed bottom-[80px] right-margin-mobile bg-primary hover:bg-primary-fixed-dim text-on-primary w-[56px] h-[56px] rounded-full shadow-[0_4px_14px_0_rgba(0,0,0,0.15)] flex items-center justify-center z-40 transition-colors"
        >
          <span className="material-symbols-outlined text-[28px]">add</span>
        </button>
      )}
    </>
  );
}

