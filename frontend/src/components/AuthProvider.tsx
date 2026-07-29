"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

interface AuthContextType {
  user: User | null;
  role: 'civic' | 'admin' | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<'civic' | 'admin' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active sessions and sets the user
    const initializeAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      await handleSession(session);
      
      // Listen for changes on auth state
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (_event, session) => {
          await handleSession(session);
        }
      );

      return () => {
        subscription.unsubscribe();
      };
    };
    
    initializeAuth();
  }, []);

  const handleSession = async (session: Session | null) => {
    setUser(session?.user ?? null);
    
    if (session?.user) {
      // Fetch user role from profiles
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();
        
      setRole(data?.role ?? 'civic');
    } else {
      setRole(null);
    }
    
    setLoading(false);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
