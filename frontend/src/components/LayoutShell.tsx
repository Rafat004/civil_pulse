"use client";

import { usePathname } from "next/navigation";
import TopNavBar from "./TopNavBar";
import BottomNavBar from "./BottomNavBar";
import GlobalModalProvider from "./GlobalModalProvider";
import { AuthProvider } from "./AuthProvider";

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname.startsWith("/auth");

  return (
    <AuthProvider>
      {!isAuthPage && <TopNavBar />}
      <div className={isAuthPage ? "" : "flex-grow w-full flex flex-col"}>
        {children}
      </div>
      {!isAuthPage && <BottomNavBar />}
      {!isAuthPage && <GlobalModalProvider />}
    </AuthProvider>
  );
}
