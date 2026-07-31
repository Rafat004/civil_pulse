"use client";

import Link from "next/link";
import { useAuth } from '@/components/AuthProvider';

export default function Home() {
  const { user } = useAuth();

  return (
    <main className="flex-grow relative overflow-hidden bg-background">
      
      {/* Animated Background Gradients */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -right-[10%] w-[50%] h-[50%] rounded-full bg-primary/20 blur-[120px] animate-pulse-slow"></div>
        <div className="absolute top-[40%] -left-[10%] w-[40%] h-[40%] rounded-full bg-tertiary/20 blur-[120px] animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
        <div className="absolute -bottom-[10%] left-[20%] w-[60%] h-[40%] rounded-full bg-secondary/10 blur-[120px] animate-pulse-slow" style={{ animationDelay: '4s' }}></div>
      </div>

      {/* Hero Section */}
      <section className="w-full max-w-[1280px] mx-auto px-margin-mobile md:px-margin-desktop py-xl relative z-10 min-h-[85vh] flex items-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-xl items-center w-full">
          {/* Text Content */}
          <div className="lg:col-span-5 flex flex-col gap-sm">
            <div className="inline-flex items-center gap-2 bg-white/10 dark:bg-black/20 backdrop-blur-md border border-white/20 dark:border-white/10 px-4 py-2 rounded-full w-fit shadow-lg transform hover:scale-105 transition-transform duration-300 animate-slide-up delay-100">
              <span className="w-2 h-2 rounded-full bg-brand-signal animate-ping"></span>
              <span className="font-label-caps text-label-caps text-on-surface uppercase tracking-wider">
                Live Incident Tracking
              </span>
            </div>
            <h1 className="font-display-lg text-display-lg md:text-[4.5rem] md:leading-[1.1] font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary via-tertiary to-secondary drop-shadow-sm mt-4 animate-slide-up delay-200">
              See what's broken.<br/>See it get fixed.
            </h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant max-w-[32rem] mt-4 text-lg animate-slide-up delay-300">
              The next-generation digital infrastructure connecting citizens directly to municipal resolution teams.
            </p>
            
            {user && (
              <div className="flex flex-col sm:flex-row gap-4 mt-8 animate-slide-up delay-400">
                <button
                  onClick={() => window.dispatchEvent(new Event('open-new-report'))}
                  className="relative group overflow-hidden bg-primary text-on-primary font-label-caps text-label-caps px-8 py-4 rounded-xl hover:shadow-[0_0_20px_rgba(var(--md-sys-color-primary),0.5)] transition-all duration-300 flex items-center justify-center gap-2 transform hover:-translate-y-1"
                >
                  <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
                  <span className="material-symbols-outlined z-10">add_location_alt</span>
                  <span className="z-10 tracking-wide">Report an Issue</span>
                </button>
                <Link
                  href="/map"
                  className="glass-card text-on-surface border border-white/20 font-label-caps text-label-caps px-8 py-4 rounded-xl hover:bg-white/10 transition-all duration-300 flex items-center justify-center gap-2 transform hover:-translate-y-1 hover:shadow-lg"
                >
                  <span className="material-symbols-outlined">map</span>
                  <span className="tracking-wide">View Public Map</span>
                </Link>
              </div>
            )}
          </div>

          {/* Hero Image Area */}
          <div className="lg:col-span-7 relative h-[500px] lg:h-[600px] w-full mt-10 lg:mt-0 flex items-center justify-center animate-float-slow">
            {/* Glassmorphic Container */}
            <div className="relative w-full h-full rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-white/60 dark:border-white/10 bg-white/40 dark:bg-black/20 backdrop-blur-xl p-3 md:p-6 group transition-all duration-700 hover:shadow-[0_20px_60px_rgba(0,0,0,0.15)] hover:border-white/80 hover:bg-white/50">
              
              {/* Image Inner Container */}
              <div className="relative w-full h-full rounded-2xl overflow-hidden bg-surface/30 shadow-inner">
                <div
                  className="absolute inset-0 bg-contain bg-center bg-no-repeat transition-transform duration-700 group-hover:scale-105"
                  style={{
                    backgroundImage: "url('/hero-bg.png')",
                  }}
                >
                  {/* Subtle glass gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-surface/20 via-transparent to-surface/10 mix-blend-overlay"></div>
                </div>
              </div>
              
              {/* Decorative Glass Glows */}
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/20 rounded-full blur-2xl z-[-1]"></div>
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-secondary/20 rounded-full blur-3xl z-[-1]"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="w-full max-w-[1280px] mx-auto px-margin-mobile md:px-margin-desktop relative z-10">
        <hr className="border-t border-outline-variant/50" />
      </div>

      {/* How It Works Section */}
      <section className="w-full max-w-[1280px] mx-auto px-margin-mobile md:px-margin-desktop py-24 relative z-10">
        <div className="text-center mb-16">
          <h2 className="font-display-md text-display-md font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary mb-4">Transparent Resolution Flow</h2>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mx-auto">
            A systematic approach to civic maintenance. Every report is tracked, scored, and routed for maximum accountability.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Step 1 */}
          <div className="glass-card backdrop-blur-lg bg-surface/40 border border-white/10 dark:border-white/5 p-8 rounded-2xl flex flex-col relative overflow-hidden group hover:-translate-y-2 hover:shadow-2xl transition-all duration-300 animate-slide-up delay-200">
            <div className="absolute -right-8 -top-8 text-primary/10 group-hover:text-primary/20 transition-colors duration-500 transform group-hover:scale-110 group-hover:rotate-12">
              <span className="material-symbols-outlined text-[160px]">report</span>
            </div>
            <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-primary to-primary-container text-white rounded-xl font-label-mono text-lg font-bold mb-6 shadow-lg z-10">01</div>
            <h3 className="font-headline-md text-headline-md text-on-surface font-bold mb-3 z-10">Report</h3>
            <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed flex-grow z-10">
              Citizens submit detailed reports with geo-tags and photos of infrastructural decay or hazards directly from their phones.
            </p>
          </div>

          {/* Step 2 */}
          <div className="glass-card backdrop-blur-lg bg-surface/40 border border-white/10 dark:border-white/5 p-8 rounded-2xl flex flex-col relative overflow-hidden group hover:-translate-y-2 hover:shadow-2xl transition-all duration-300 animate-slide-up delay-300">
            <div className="absolute -right-8 -top-8 text-tertiary/10 group-hover:text-tertiary/20 transition-colors duration-500 transform group-hover:scale-110 group-hover:-rotate-12">
              <span className="material-symbols-outlined text-[160px]">fact_check</span>
            </div>
            <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-tertiary to-tertiary-container text-white rounded-xl font-label-mono text-lg font-bold mb-6 shadow-lg z-10">02</div>
            <h3 className="font-headline-md text-headline-md text-on-surface font-bold mb-3 z-10">Citizen Verification</h3>
            <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed flex-grow z-10 mb-6">
              Local residents review and upvote reports, ensuring that the most impactful infrastructure issues are prioritized for repair.
            </p>
          </div>

          {/* Step 3 */}
          <div className="glass-card backdrop-blur-lg bg-surface/40 border border-white/10 dark:border-white/5 p-8 rounded-2xl flex flex-col relative overflow-hidden group hover:-translate-y-2 hover:shadow-2xl transition-all duration-300 animate-slide-up delay-400">
            <div className="absolute -right-8 -top-8 text-secondary/10 group-hover:text-secondary/20 transition-colors duration-500 transform group-hover:scale-110 group-hover:rotate-12">
              <span className="material-symbols-outlined text-[160px]">engineering</span>
            </div>
            <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-secondary to-secondary-container text-white rounded-xl font-label-mono text-lg font-bold mb-6 shadow-lg z-10">03</div>
            <h3 className="font-headline-md text-headline-md text-on-surface font-bold mb-3 z-10">Resolution</h3>
            <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed flex-grow z-10">
              Routed directly to the relevant municipal department dashboard for assignment, repair, and transparent public closure.
            </p>
          </div>
        </div>
      </section>

      {/* Trust / SDG Section */}
      <section className="bg-surface-container-low/50 backdrop-blur-md border-y border-outline-variant/30 py-16 relative z-10">
        <div className="w-full max-w-[1280px] mx-auto px-margin-mobile md:px-margin-desktop text-center">
          <p className="font-label-caps text-label-caps tracking-widest text-on-surface-variant uppercase mb-8">
            Aligned with UN Sustainable Development Goals
          </p>
          <div className="flex flex-wrap justify-center gap-8 md:gap-16">
            <div className="flex flex-col items-center gap-3 opacity-60 hover:opacity-100 hover:-translate-y-1 transition-all duration-300 cursor-default group">
              <div className="bg-surface-variant p-4 rounded-full group-hover:bg-primary/20 transition-colors">
                <span className="material-symbols-outlined text-[32px] text-on-surface group-hover:text-primary transition-colors">location_city</span>
              </div>
              <span className="font-label-caps text-xs font-bold text-on-surface uppercase tracking-wider">Sustainable Cities</span>
            </div>
            <div className="flex flex-col items-center gap-3 opacity-60 hover:opacity-100 hover:-translate-y-1 transition-all duration-300 cursor-default group">
              <div className="bg-surface-variant p-4 rounded-full group-hover:bg-tertiary/20 transition-colors">
                <span className="material-symbols-outlined text-[32px] text-on-surface group-hover:text-tertiary transition-colors">account_balance</span>
              </div>
              <span className="font-label-caps text-xs font-bold text-on-surface uppercase tracking-wider">Strong Institutions</span>
            </div>
            <div className="flex flex-col items-center gap-3 opacity-60 hover:opacity-100 hover:-translate-y-1 transition-all duration-300 cursor-default group">
              <div className="bg-surface-variant p-4 rounded-full group-hover:bg-secondary/20 transition-colors">
                <span className="material-symbols-outlined text-[32px] text-on-surface group-hover:text-secondary transition-colors">diversity_3</span>
              </div>
              <span className="font-label-caps text-xs font-bold text-on-surface uppercase tracking-wider">Reduced Inequalities</span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
