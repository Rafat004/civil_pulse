"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
    } else {
      router.push("/");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="bg-surface-container rounded-2xl w-full max-w-[400px] border border-outline-variant shadow-2xl flex flex-col p-xl gap-lg">
        
        <div className="flex flex-col gap-xs text-center">
          <h1 className="text-headline-lg font-headline-lg text-on-surface">Welcome Back</h1>
          <p className="text-body-md text-on-surface-variant">Sign in to your CivicPulse account.</p>
        </div>

        {error && (
          <div className="bg-error/10 text-error p-sm rounded-lg border border-error/20 font-body-md text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="flex flex-col gap-md">
          <div className="flex flex-col gap-xs">
            <label className="text-label-md font-label-md text-on-surface-variant">Email</label>
            <input 
              type="email"
              required 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              className="bg-surface p-sm rounded-lg border border-outline-variant text-on-surface focus:outline-none focus:border-primary transition-colors" 
              placeholder="name@example.com" 
            />
          </div>

          <div className="flex flex-col gap-xs">
            <label className="text-label-md font-label-md text-on-surface-variant">Password</label>
            <input 
              type="password"
              required 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              className="bg-surface p-sm rounded-lg border border-outline-variant text-on-surface focus:outline-none focus:border-primary transition-colors" 
              placeholder="••••••••" 
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="mt-sm bg-primary text-on-primary px-lg py-sm rounded-lg font-label-md text-label-md hover:bg-primary-fixed-dim transition-colors shadow-md disabled:opacity-50 w-full flex items-center justify-center"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="text-center text-body-sm text-on-surface-variant">
          Don't have an account? <Link href="/auth/register" className="text-primary hover:underline font-label-md">Sign Up</Link>
        </p>

      </div>
    </div>
  );
}
