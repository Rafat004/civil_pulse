"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, MapPinned, Plus, Radio, Search, Sparkles } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import TrendingComplaintCard from "@/components/TrendingComplaintCard";
import { Button, EmptyState, InlineError, LoadingSkeleton, SegmentedControl, Surface } from "@/components/ui";
import { getPublicFeed, type FeedSortOption } from "@/services/feed";
import { REPORT_CATEGORIES } from "@/lib/constants";
import { supabase } from "@/lib/supabaseClient";
import type { Report } from "@/lib/types";

const feedOptions = ["Latest", "Most Affected", "Recently Updated"] as const satisfies readonly FeedSortOption[];

function getGreeting(name?: string | null) {
  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  return name ? `${timeGreeting}, ${name.split(" ")[0]}` : timeGreeting;
}

export default function Home() {
  const { user } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState<FeedSortOption>("Latest");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const loadFeed = useCallback(async () => {
    try {
      setLoading(true);
      setReports(await getPublicFeed(sortOption, selectedCategory));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load the civic feed.");
    } finally {
      setLoading(false);
    }
  }, [sortOption, selectedCategory]);

  useEffect(() => { void Promise.resolve().then(loadFeed); }, [loadFeed]);

  useEffect(() => {
    const channel = supabase
      .channel("public-feed-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "reports" }, () => void loadFeed())
      .on("postgres_changes", { event: "*", schema: "public", table: "report_reactions" }, () => void loadFeed())
      .on("postgres_changes", { event: "*", schema: "public", table: "comments" }, () => void loadFeed())
      .on("postgres_changes", { event: "*", schema: "public", table: "report_status_history" }, () => void loadFeed())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadFeed]);

  const summary = useMemo(() => {
    const active = reports.filter((report) => !["Resolved", "Rejected", "Duplicate"].includes(report.status)).length;
    const affected = reports.reduce((total, report) => total + (report.affected_count || 0), 0);
    const resolved = reports.filter((report) => report.status === "Resolved").length;
    return { active, affected, resolved };
  }, [reports]);

  const fullName = user?.user_metadata?.full_name || user?.email?.split("@")[0];
  const initial = (fullName || "C").charAt(0).toUpperCase();

  return (
    <main className="civic-page pb-16">
      <section className="civic-container pt-6 md:pt-10">
        <div className="mx-auto max-w-[760px]">
          <div className="flex items-start justify-between gap-5">
            <div>
              <p className="civic-kicker inline-flex items-center gap-2"><Radio size={13} />Community feed</p>
              <h1 className="mt-3 font-headline-lg text-[clamp(2.2rem,5vw,4rem)] font-extrabold leading-[1] tracking-[-0.06em] text-primary">{getGreeting(fullName)}.</h1>
              <p className="mt-3 max-w-[38rem] text-sm leading-6 text-on-surface-variant md:text-base">See what needs attention nearby, add your local signal, and follow the work from first report to resolution.</p>
            </div>
            <Link href="/map" className="civic-focus hidden shrink-0 items-center gap-2 rounded-xl border border-[#d8d6cf] bg-white px-3 py-2.5 text-xs font-extrabold text-primary shadow-sm hover:bg-[#faf9f5] sm:inline-flex"><MapPinned size={16} />Map</Link>
          </div>

          <Surface className="mt-6 p-3 sm:p-4">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#eee8dc] text-sm font-extrabold text-primary">{initial}</span>
              <button type="button" onClick={() => user ? window.dispatchEvent(new Event("open-new-report")) : undefined} className="civic-focus min-h-11 flex-1 rounded-xl border border-[#e4e1d9] bg-[#faf9f5] px-4 text-left text-sm font-semibold text-on-surface-variant hover:border-[#b7b4aa]">
                {user ? "What civic issue should your neighbors know about?" : "Sign in to report a local issue"}
              </button>
              {user ? <Button size="sm" onClick={() => window.dispatchEvent(new Event("open-new-report"))}><Plus size={16} /><span className="hidden sm:inline">Report</span></Button> : <Link href="/auth/login" className="civic-focus inline-flex min-h-9 items-center rounded-xl bg-primary px-3 text-xs font-extrabold text-white">Sign in</Link>}
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-[#ece9e1] pt-3 text-[11px] font-bold text-on-surface-variant">
              <span className="inline-flex items-center gap-1.5"><Sparkles size={13} className="text-[#9a6119]" /> A useful report starts with a clear place and what happened.</span>
              <Link href="/map" className="civic-focus inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-primary hover:bg-[#eee8dc] sm:hidden"><MapPinned size={14} />Map</Link>
            </div>
          </Surface>
        </div>
      </section>

      <section className="civic-container mt-8">
        <div className="mx-auto max-w-[760px]">
          <div className="flex flex-col gap-3 border-b border-[#d8d6cf] pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="text-sm font-extrabold text-primary">Your civic neighborhood</p><p className="mt-1 text-xs text-on-surface-variant">{reports.length} issues · {summary.active} active · {summary.affected} affected signals{summary.resolved ? ` · ${summary.resolved} resolved` : ""}</p></div>
            <div className="flex items-center gap-2"><SegmentedControl options={feedOptions} value={sortOption} onChange={setSortOption} /><label className="sr-only" htmlFor="feed-category">Filter by category</label><div className="relative hidden sm:block"><Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" /><select id="feed-category" value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)} className="civic-focus h-10 appearance-none rounded-xl border border-[#d8d6cf] bg-white pl-8 pr-7 text-xs font-bold text-primary"><option value="All">All topics</option>{REPORT_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}</select></div></div>
          </div>
          <div className="mt-3 flex items-center justify-between sm:hidden"><label className="text-xs font-extrabold text-on-surface-variant" htmlFor="feed-category-mobile">Filter topics</label><select id="feed-category-mobile" value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)} className="civic-focus h-9 rounded-lg border border-[#d8d6cf] bg-white px-2 text-xs font-bold text-primary"><option value="All">All topics</option>{REPORT_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}</select></div>

          {loading ? <div className="mt-5 space-y-5"><LoadingSkeleton className="h-[420px]" /><LoadingSkeleton className="h-[360px]" /></div> : error ? <div className="mt-5"><InlineError>{error}</InlineError><Button variant="secondary" size="sm" className="mt-3" onClick={() => void loadFeed()}>Try again</Button></div> : reports.length === 0 ? <div className="mt-5"><EmptyState icon={<Search size={34} />} title="No issues in this view" description="Try another topic or clear the filter to see what your community is reporting." action={selectedCategory !== "All" ? <Button variant="secondary" onClick={() => setSelectedCategory("All")}>Show all issues</Button> : <Button onClick={() => user ? window.dispatchEvent(new Event("open-new-report")) : undefined}>{user ? <><Plus size={17} />Report the first issue</> : "Sign in to report"}</Button>} /></div> : <div className="mt-5 space-y-5">{reports.map((report) => <TrendingComplaintCard key={report.id} id={report.id} category={report.category} title={report.title} description={report.description} zone={report.zone} status={report.status} affectedCount={report.affected_count || 0} confirmedCount={report.confirmed_count || 0} commentCount={report.comment_count || 0} imageUrl={report.image_url || undefined} resolutionImageUrl={report.resolution_image_url || undefined} reporterName={report.reporter_name} reporterRole={report.reporter_role} createdAt={report.created_at} latestUpdateNote={report.latest_update_note} latestUpdateAt={report.latest_update_at} />)}</div>}

          <div className="mt-8 flex justify-center"><Link href="/map" className="civic-focus inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-extrabold text-primary hover:bg-[#eee8dc]">Explore every issue on the map <ArrowRight size={16} /></Link></div>
        </div>
      </section>
    </main>
  );
}
