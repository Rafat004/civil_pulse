"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, BarChart3, CheckCircle2, CircleDot, MapPinned, Plus, Radio, Search, Sparkles } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import TrendingComplaintCard from "@/components/TrendingComplaintCard";
import { Button, EmptyState, LoadingSkeleton, MetricCard, SegmentedControl, Surface } from "@/components/ui";
import { getPublicFeed, type FeedSortOption } from "@/services/feed";
import { REPORT_CATEGORIES } from "@/lib/constants";
import { supabase } from "@/lib/supabaseClient";
import type { Report } from "@/lib/types";

const feedOptions = ["Latest", "Most Affected", "Recently Updated"] as const satisfies readonly FeedSortOption[];

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
      setError(err instanceof Error ? err.message : "Failed to load public issue feed.");
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
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadFeed]);

  const summary = useMemo(() => {
    const active = reports.filter((report) => !["Resolved", "Rejected", "Duplicate"].includes(report.status)).length;
    const resolved = reports.filter((report) => report.status === "Resolved").length;
    const categoryCounts = reports.reduce<Record<string, number>>((counts, report) => {
      counts[report.category] = (counts[report.category] || 0) + 1;
      return counts;
    }, {});
    const mostAffectedCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "No trend yet";
    return { active, resolved, mostAffectedCategory };
  }, [reports]);

  const featured = reports[0];

  return (
    <main className="civic-page pb-12">
      <section className="civic-container pt-10 md:pt-16">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] lg:items-end">
          <div className="max-w-3xl">
            <div className="civic-kicker inline-flex items-center gap-2"><Radio size={13} />Live civic pulse</div>
            <h1 className="mt-4 max-w-3xl font-headline-lg text-[clamp(2.6rem,6vw,5.5rem)] font-extrabold leading-[0.98] tracking-[-0.065em] text-primary">See what needs attention.<br /><span className="text-[#9a6119]">See it move forward.</span></h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-on-surface-variant md:text-lg">A clearer way for neighbors to report local problems, build community signal, and follow progress from first report to resolution.</p>
          </div>
          <div className="flex flex-wrap gap-3 lg:justify-end">
            {user && <Button size="lg" onClick={() => window.dispatchEvent(new Event("open-new-report"))}><Plus size={18} />Report an issue</Button>}
            <Link href="/map" className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl border border-[#d8d6cf] bg-white px-5 text-sm font-bold text-primary shadow-sm transition-colors hover:border-primary/40 hover:bg-[#faf9f5]"><MapPinned size={18} />Explore the map</Link>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-4">
          <MetricCard label="Visible reports" value={reports.length} detail="In this feed" icon={<BarChart3 size={18} />} />
          <MetricCard label="Active issues" value={summary.active} detail="Still moving" tone="amber" icon={<CircleDot size={18} />} />
          <MetricCard label="Resolved" value={summary.resolved} detail="Closed with evidence" tone="green" icon={<CheckCircle2 size={18} />} />
          <MetricCard label="Leading signal" value={summary.mostAffectedCategory} detail="Most represented category" tone="blue" icon={<Sparkles size={18} />} />
        </div>
      </section>

      <section className="civic-container mt-12">
        <div className="flex flex-col gap-4 border-b border-[#d8d6cf] pb-5 md:flex-row md:items-end md:justify-between">
          <div><p className="civic-kicker">Community issue feed</p><h2 className="mt-1 font-headline-md text-headline-md font-bold tracking-[-0.04em] text-on-surface">What your city is talking about</h2></div>
          <div className="flex flex-wrap items-center gap-3"><SegmentedControl options={feedOptions} value={sortOption} onChange={setSortOption} /><label className="sr-only" htmlFor="feed-category">Filter by category</label><div className="relative"><Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" /><select id="feed-category" value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)} className="civic-focus h-10 appearance-none rounded-xl border border-[#d8d6cf] bg-white pl-9 pr-8 text-xs font-bold text-primary"><option value="All">All categories</option>{REPORT_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}</select></div></div>
        </div>

        {loading ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2"><LoadingSkeleton className="h-56" /><LoadingSkeleton className="h-56" /><LoadingSkeleton className="h-56" /><LoadingSkeleton className="h-56" /></div>
        ) : error ? (
          <Surface className="mt-6 border-[#efc3c0] bg-[#fff1ef] p-5 text-sm text-[#9a3d38]" role="alert">{error}</Surface>
        ) : reports.length === 0 ? (
          <div className="mt-6"><EmptyState icon={<Search size={34} />} title="No reports match this view" description="Try another category or return to all civic issues to see what your community is reporting." action={selectedCategory !== "All" ? <Button variant="secondary" onClick={() => setSelectedCategory("All")}>Clear category filter</Button> : undefined} /></div>
        ) : (
          <>
            {featured && <Surface className="mt-6 overflow-hidden border-primary/15 bg-[#fffefa] p-5 md:p-7"><div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between"><div className="max-w-2xl"><p className="civic-kicker flex items-center gap-2"><Sparkles size={14} />Featured community issue</p><h3 className="mt-3 font-headline-md text-[clamp(1.5rem,3vw,2.2rem)] font-bold tracking-[-0.045em] text-primary">{featured.title}</h3><p className="mt-2 line-clamp-2 text-sm leading-6 text-on-surface-variant">{featured.description}</p><Link href={`/issues/${featured.id}`} className="mt-5 inline-flex items-center gap-2 text-sm font-extrabold text-primary hover:text-[#9a6119]">View issue <ArrowRight size={16} /></Link></div><div className="grid min-w-[180px] grid-cols-2 gap-3"><div className="rounded-xl bg-[#f5f0e7] p-4"><p className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-on-surface-variant">Affected</p><p className="mt-2 text-2xl font-extrabold text-[#9a6119]">{featured.affected_count || 0}</p></div><div className="rounded-xl bg-[#edf4ee] p-4"><p className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-on-surface-variant">Confirmed</p><p className="mt-2 text-2xl font-extrabold text-[#39704a]">{featured.confirmed_count || 0}</p></div></div></div></Surface>}
            <div className="mt-4 grid gap-4 md:grid-cols-2">{reports.slice(1).map((report) => <TrendingComplaintCard key={report.id} id={report.id} category={report.category} title={report.title} description={report.description} zone={report.zone} status={report.status} affectedCount={report.affected_count || 0} confirmedCount={report.confirmed_count || 0} imageUrl={report.image_url || undefined} />)}</div>
          </>
        )}
      </section>
    </main>
  );
}
