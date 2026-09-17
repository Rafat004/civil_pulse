"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const passwordIsLongEnough = password.length >= 8;
  const passwordHasNumber = /\d/.test(password);

  const handleRegister = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!fullName.trim()) {
      setError("Please enter your full name.");
      return;
    }

    if (!passwordIsLongEnough) {
      setError("Your password must be at least 8 characters long.");
      return;
    }

    setLoading(true);

    const { error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
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
          <span>Already have an account?</span>
          <Link href="/auth/login">Sign in</Link>
        </div>
      </header>

      <div className="register-layout">
        <section className="register-intro" aria-labelledby="register-intro-title">
          <div className="register-eyebrow">
            <span className="register-eyebrow-dot" aria-hidden="true" />
            Your city, within reach
          </div>

          <h1 id="register-intro-title">
            Turn local issues into <span>visible action.</span>
          </h1>
          <p className="register-intro-copy">
            Join your community to report problems, support the issues that matter,
            and follow every update through resolution.
          </p>

          <div className="register-journey" aria-label="How CivicPulse works">
            <div className="register-journey-line" aria-hidden="true" />
            <div className="register-journey-item">
              <span className="register-step-number">01</span>
              <div>
                <strong>Report in minutes</strong>
                <p>Add a location, a short description, and an optional photo.</p>
              </div>
            </div>
            <div className="register-journey-item">
              <span className="register-step-number">02</span>
              <div>
                <strong>Build community priority</strong>
                <p>Support nearby reports so urgent issues rise to the top.</p>
              </div>
            </div>
            <div className="register-journey-item">
              <span className="register-step-number">03</span>
              <div>
                <strong>Track real progress</strong>
                <p>See each report move from submitted to resolved.</p>
              </div>
            </div>
          </div>

          <div className="register-trust-note">
            <span className="material-symbols-outlined" aria-hidden="true">verified_user</span>
            <span>Your account keeps reports and updates connected to you.</span>
          </div>
        </section>

        <section className="register-card" aria-labelledby="register-form-title">
          <div className="register-card-heading">
            <span className="register-card-kicker">Get started</span>
            <h2 id="register-form-title">Create your account</h2>
            <p>Enter your details below. It only takes a minute.</p>
          </div>

          {error && (
            <div className="register-error" role="alert">
              <span className="material-symbols-outlined" aria-hidden="true">error</span>
              <span>{error}</span>
            </div>
          )}

          <form className="register-form" onSubmit={handleRegister}>
            <div className="register-field">
              <label htmlFor="full-name">Full name</label>
              <div className="register-input-wrap">
                <span className="material-symbols-outlined" aria-hidden="true">person</span>
                <input
                  id="full-name"
                  name="name"
                  type="text"
                  required
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="e.g. Amina Rahman"
                  autoComplete="name"
                  autoFocus
                />
              </div>
            </div>

            <div className="register-field">
              <label htmlFor="email">Email address</label>
              <div className="register-input-wrap">
                <span className="material-symbols-outlined" aria-hidden="true">mail</span>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  inputMode="email"
                />
              </div>
            </div>

            <div className="register-role-group" aria-label="Account type">
              <span>Account type</span>
              <div className="register-role-option is-selected">
                <span className="material-symbols-outlined" aria-hidden="true">home_pin</span>
                <span>
                  <strong>Citizen</strong>
                  <small>Report issues and support your community</small>
                </span>
                <span className="register-role-check material-symbols-outlined" aria-hidden="true">
                  check_circle
                </span>
              </div>
            </div>

            <div className="register-field">
              <label htmlFor="password">Password</label>
              <div className="register-input-wrap">
                <span className="material-symbols-outlined" aria-hidden="true">lock</span>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Create a secure password"
                  autoComplete="new-password"
                  aria-describedby="password-guidance"
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
              <div id="password-guidance" className="register-password-guidance">
                <span className={passwordIsLongEnough ? "is-valid" : ""}>
                  <span className="material-symbols-outlined" aria-hidden="true">check</span>
                  8+ characters
                </span>
                <span className={passwordHasNumber ? "is-valid" : ""}>
                  <span className="material-symbols-outlined" aria-hidden="true">check</span>
                  Include a number
                </span>
              </div>
            </div>

            <button type="submit" disabled={loading} className="register-submit">
              <span>{loading ? "Creating your account..." : "Create account"}</span>
              <span className={`material-symbols-outlined ${loading ? "register-spinner" : ""}`} aria-hidden="true">
                {loading ? "progress_activity" : "arrow_forward"}
              </span>
            </button>
          </form>

          <p className="register-legal">
            By creating an account, you agree to use CivicPulse responsibly and
            provide accurate community reports.
          </p>

          <div className="register-mobile-signin">
            Already have an account? <Link href="/auth/login">Sign in</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
