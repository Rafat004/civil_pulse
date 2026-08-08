"use client";

import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isOn, setIsOn] = useState(false);
  const [tugged, setTugged] = useState(false);
  const router = useRouter();

  const handlePullChain = useCallback(() => {
    // Trigger tug animation
    setTugged(true);
    setTimeout(() => setTugged(false), 600);
    // Toggle lamp
    setIsOn((prev) => !prev);
  }, []);

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
    <div className={`lamp-scene ${isOn ? "lamp-scene--on" : "lamp-scene--off"}`}>
      {/* Branding */}
      <Link href="/" className="auth-brand">
        <span className="material-symbols-outlined auth-brand-icon" style={{ fontVariationSettings: "'FILL' 1" }}>
          assured_workload
        </span>
        <span className="auth-brand-name">CivicPulse</span>
      </Link>

      {/* Title */}
      <div className="lamp-title">Login Form</div>

      {/* Prompt to interact */}
      <div className="lamp-prompt">Click the pull chain to turn on the lamp</div>

      {/* ── Desk Lamp ── */}
      <div className="lamp-container">
        {/* Light effects (behind lamp) */}
        <div className="lamp-light-cone"></div>
        <div className="lamp-ambient-glow"></div>

        {/* Lamp dome */}
        <div className="lamp-dome">
          {/* Pull chain hangs from the dome */}
          <div
            className={`pull-chain ${tugged ? "pull-chain--tugged" : ""}`}
            onClick={handlePullChain}
            role="button"
            aria-label="Toggle lamp"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") handlePullChain();
            }}
          >
            <div className="pull-chain-string"></div>
            <div className="pull-chain-ball"></div>
          </div>

          {/* Bulb glow */}
          <div className="lamp-bulb-glow"></div>
        </div>

        {/* Lamp stem */}
        <div className="lamp-stem"></div>

        {/* Lamp base */}
        <div className="lamp-base"></div>

        {/* Surface glow */}
        <div className="lamp-surface-glow"></div>
      </div>

      {/* ── Glassmorphism Login Form ── */}
      <div className="auth-glass-form">
        <h2>Welcome</h2>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleLogin}>
          <div className="auth-input-group">
            <label>Username</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter name"
              autoComplete="email"
            />
          </div>

          <div className="auth-input-group">
            <label>Password</label>
            <div className="auth-password-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter Password"
                autoComplete="current-password"
              />
              <button
                type="button"
                className="auth-password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                  {showPassword ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="auth-gold-btn"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="auth-switch-link">
          Don&apos;t have an account?{" "}
          <Link href="/auth/register">Sign Up</Link>
        </div>
      </div>
    </div>
  );
}
