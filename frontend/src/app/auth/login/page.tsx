"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    router.push("/");
  };

  return (
    <main className="register-page">
      <header className="register-header">
        <Link href="/" className="register-brand" aria-label="CivicPulse home">
          <span className="register-brand-mark" aria-hidden="true">
            <span className="material-symbols-outlined">assured_workload</span>
          </span>
          <span>CivicPulse</span>
        </Link>

        <div className="register-header-action">
          <span>New to CivicPulse?</span>
          <Link href="/auth/register">Create account</Link>
        </div>
      </header>

      <div className="register-layout">
        <section className="register-intro" aria-labelledby="login-intro-title">
          <div className="register-eyebrow">
            <span className="register-eyebrow-dot" aria-hidden="true" />
            Welcome back
          </div>

          <h1 id="login-intro-title">
            Stay connected to <span>your community.</span>
          </h1>
          <p className="register-intro-copy">
            Sign in to follow your reports, see what is changing nearby, and keep
            important civic issues moving forward.
          </p>

          <div className="register-journey" aria-label="What you can do in CivicPulse">
            <div className="register-journey-line" aria-hidden="true" />
            <div className="register-journey-item">
              <span className="register-step-number">01</span>
              <div>
                <strong>Pick up where you left off</strong>
                <p>See your submitted reports and their latest status.</p>
              </div>
            </div>
            <div className="register-journey-item">
              <span className="register-step-number">02</span>
              <div>
                <strong>Follow local priorities</strong>
                <p>Explore nearby issues and support what matters most.</p>
              </div>
            </div>
            <div className="register-journey-item">
              <span className="register-step-number">03</span>
              <div>
                <strong>See progress clearly</strong>
                <p>Track every update from initial report to resolution.</p>
              </div>
            </div>
          </div>

          <div className="register-trust-note">
            <span className="material-symbols-outlined" aria-hidden="true">shield_lock</span>
            <span>Your CivicPulse session is securely managed by Supabase.</span>
          </div>
        </section>

        <section className="register-card login-card" aria-labelledby="login-form-title">
          <div className="register-card-heading">
            <span className="register-card-kicker">Account access</span>
            <h2 id="login-form-title">Sign in to CivicPulse</h2>
            <p>Use the email and password linked to your account.</p>
          </div>

          {error && (
            <div className="register-error" role="alert">
              <span className="material-symbols-outlined" aria-hidden="true">error</span>
              <span>{error}</span>
            </div>
          )}

          <form className="register-form" onSubmit={handleLogin}>
            <div className="register-field">
              <label htmlFor="login-email">Email address</label>
              <div className="register-input-wrap">
                <span className="material-symbols-outlined" aria-hidden="true">mail</span>
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  inputMode="email"
                  autoFocus
                />
              </div>
            </div>

            <div className="register-field">
              <label htmlFor="login-password">Password</label>
              <div className="register-input-wrap">
                <span className="material-symbols-outlined" aria-hidden="true">lock</span>
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="register-password-toggle"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  <span className="material-symbols-outlined" aria-hidden="true">
                    {showPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="register-submit">
              <span>{loading ? "Signing you in..." : "Sign in"}</span>
              <span className={`material-symbols-outlined ${loading ? "register-spinner" : ""}`} aria-hidden="true">
                {loading ? "progress_activity" : "arrow_forward"}
              </span>
            </button>
          </form>

          <div className="login-security-note">
            <span className="material-symbols-outlined" aria-hidden="true">lock</span>
            <span>Your password is encrypted and never displayed.</span>
          </div>

          <div className="register-mobile-signin">
            New to CivicPulse? <Link href="/auth/register">Create an account</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
