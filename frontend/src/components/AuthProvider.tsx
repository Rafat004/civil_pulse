"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import type { UserRole } from "@/lib/types";

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  loading: boolean;
  error: string | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  loading: true,
  error: null,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleSession = useCallback(async (session: Session | null) => {
    setUser(session?.user ?? null);
    setError(null);

    if (!session?.user) {
      setRole(null);
      setLoading(false);
      return;
    }

    const { data, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single();

    if (profileError) {
      setRole(null);
      setError("We could not load your CivicPulse profile. Please sign in again.");
    } else {
      setRole(data.role as UserRole);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;

    const initializeAuth = async () => {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (!active) return;

      if (sessionError) {
        setError(sessionError.message);
        setLoading(false);
        return;
      }

      await handleSession(data.session);
    };

    void initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (active) void handleSession(session);
      },
    );

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [handleSession]);

  const signOut = async () => {
    setError(null);
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      setError(signOutError.message);
      throw signOutError;
    }
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, error, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
