"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import TrendingComplaintCard from "@/components/TrendingComplaintCard";
import { getPublicFeed, type FeedSortOption } from "@/services/feed";
import { REPORT_CATEGORIES } from "@/lib/constants";
import { supabase } from "@/lib/supabaseClient";
import type { Report } from "@/lib/types";

export default function Home() {
  const { user } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Feed Filter States
  const [sortOption, setSortOption] = useState<FeedSortOption>("Latest");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const loadFeed = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getPublicFeed(sortOption, selectedCategory);
      setReports(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load public issue feed.");
    } finally {
      setLoading(false);
    }
  }, [sortOption, selectedCategory]);

  useEffect(() => {
    void Promise.resolve().then(loadFeed);
  }, [loadFeed]);

  // Realtime updates for reports and reactions on homepage
  useEffect(() => {
    const channel = supabase
      .channel("public-feed-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reports" },
        () => {
          // Refetch feed with current sort/filter instead of prepending
          loadFeed();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "report_reactions" },
        () => {
          // Refetch feed when reactions change so Most Affected ordering updates in real-time
          loadFeed();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadFeed]);

  return (
    <main className="flex-grow relative overflow-hidden bg-background">
      {/* Animated Background Gradients */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -right-[10%] w-[50%] h-[50%] rounded-full bg-primary/20 blur-[120px] animate-pulse-slow"></div>
        <div className="absolute top-[40%] -left-[10%] w-[40%] h-[40%] rounded-full bg-tertiary/20 blur-[120px] animate-pulse-slow" style={{ animationDelay: "2s" }}></div>
        <div className="absolute -bottom-[10%] left-[20%] w-[60%] h-[40%] rounded-full bg-secondary/10 blur-[120px] animate-pulse-slow" style={{ animationDelay: "4s" }}></div>
      </div>

      {/* Hero Section */}
      <section className="w-full max-w-[1280px] mx-auto px-margin-mobile md:px-margin-desktop pt-xl pb-md relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-md mb-lg">
          <div>
            <div className="inline-flex items-center gap-2 bg-white/10 dark:bg-black/20 backdrop-blur-md border border-white/20 dark:border-white/10 px-4 py-1.5 rounded-full w-fit shadow-md mb-3">
              <span className="w-2 h-2 rounded-full bg-brand-signal animate-ping"></span>
              <span className="font-label-caps text-xs text-on-surface uppercase tracking-wider font-semibold">
                Live Public Issue Feed
              </span>
            </div>
            <h1 className="font-display-md md:text-headline-lg font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary via-tertiary to-secondary">
              See what&apos;s broken. See it get fixed.
            </h1>
            <p className="font-body-md text-on-surface-variant max-w-xl mt-2 text-sm md:text-base">
              Transparent digital infrastructure connecting citizens directly to municipal resolution teams.
            </p>
          </div>

          <div className="flex flex-wrap gap-sm">
            {user && (
              <button
                onClick={() => window.dispatchEvent(new Event("open-new-report"))}
                className="bg-primary text-on-primary font-label-md text-xs font-semibold px-5 py-3 rounded-xl hover:shadow-[0_0_20px_rgba(var(--md-sys-color-primary),0.5)] transition-all flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-lg">add_location_alt</span>
                <span>Report an Issue</span>
              </button>
            )}
            <Link
              href="/map"
              className="glass-card text-on-surface border border-white/20 font-label-md text-xs font-semibold px-5 py-3 rounded-xl hover:bg-white/10 transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">map</span>
              <span>View Public Map</span>
            </Link>
          </div>
        </div>

        {/* Feed Filter & Sort Controls */}
        <div className="glass-card bg-surface/60 border border-outline-variant/60 rounded-2xl p-sm md:p-md mb-lg flex flex-col sm:flex-row items-center justify-between gap-md shadow-sm">
          {/* Sorting Tabs */}
          <div className="flex items-center gap-1 bg-surface-container p-1 rounded-xl border border-outline-variant/40 w-full sm:w-auto overflow-x-auto">
            {(["Latest", "Most Affected", "Recently Updated"] as FeedSortOption[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setSortOption(tab)}
                className={`px-4 py-2 rounded-lg font-label-md text-xs font-semibold transition-all whitespace-nowrap ${
                  sortOption === tab
                    ? "bg-primary text-on-primary shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface hover:bg-surface/50"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Category Filter Dropdown */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-semibold text-on-surface-variant flex items-center gap-1 whitespace-nowrap">
              <span className="material-symbols-outlined text-[16px]">filter_list</span>
              Category:
            </span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-surface p-2 rounded-xl border border-outline-variant text-on-surface text-xs focus:outline-none focus:border-primary w-full sm:w-48 cursor-pointer font-medium"
            >
              <option value="All">All Categories</option>
              {REPORT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Issue Feed List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-on-surface-variant">
            <span className="material-symbols-outlined animate-spin text-3xl">sync</span>
            <span className="font-label-md text-sm">Loading community issues...</span>
          </div>
        ) : error ? (
          <div className="bg-error/10 border border-error/20 p-md rounded-2xl text-error text-center my-md font-body-md">
            {error}
          </div>
        ) : reports.length === 0 ? (
          <div className="glass-card bg-surface/40 border border-outline-variant/60 rounded-2xl p-xl text-center flex flex-col items-center gap-sm">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant">inbox</span>
            <h3 className="font-headline-md text-on-surface font-bold">No issues found</h3>
            <p className="text-on-surface-variant text-sm max-w-md">
              There are currently no civic reports matching your selected category filter or sorting option.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-md">
            {reports.map((report) => (
              <TrendingComplaintCard
                key={report.id}
                id={report.id}
                category={report.category}
                title={report.title}
                description={report.description}
                zone={report.zone}
                status={report.status}
                affectedCount={report.affected_count || 0}
                confirmedCount={report.confirmed_count || 0}
                imageUrl={report.image_url || undefined}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
