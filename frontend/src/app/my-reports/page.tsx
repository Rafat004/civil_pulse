"use client";

import { useEffect, useMemo, useState } from "react";
import { ClipboardList, Filter, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import MyReportCard from "@/components/MyReportCard";
import { Button, EmptyState, InlineError, LoadingSkeleton, MetricCard, PageHeader } from "@/components/ui";
import { StatusType } from "@/components/StatusBadge";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/components/AuthProvider";
import { REPORT_STATUSES } from "@/lib/constants";

interface Report { id: string; title: string; description: string; status: string; created_at: string; updated_at?: string; }

export default function MyReports() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("All");

  useEffect(() => {
    if (!authLoading && !user) { router.push("/auth/login"); return; }
    if (!user) return;
    const fetchReports = async () => {
      setLoading(true);
      const { data, error: fetchError } = await supabase.from("reports").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      if (fetchError) setError(fetchError.message); else { setReports(data || []); setError(null); }
      setLoading(false);
    };
    void fetchReports();
  }, [user, authLoading, router]);

  const filteredReports = useMemo(() => statusFilter === "All" ? reports : reports.filter((report) => report.status === statusFilter), [reports, statusFilter]);
  const resolved = reports.filter((report) => report.status === "Resolved").length;
  const active = reports.length - resolved;

  if (authLoading || loading) return <main className="civic-page"><div className="civic-container py-12"><LoadingSkeleton className="h-24" /><div className="mt-6 grid gap-4 md:grid-cols-3"><LoadingSkeleton className="h-28" /><LoadingSkeleton className="h-28" /><LoadingSkeleton className="h-28" /></div><div className="mt-6 grid gap-4"><LoadingSkeleton className="h-48" /><LoadingSkeleton className="h-48" /></div></div></main>;
  if (!user) return null;

  return (
    <main className="civic-page pb-12">
      <div className="civic-container py-10 md:py-14">
        <PageHeader eyebrow="Your civic record" title="My reports" description="Keep track of the issues you have raised and the progress they make through the civic workflow." actions={<Button onClick={() => window.dispatchEvent(new Event("open-new-report"))}><Plus size={17} />Report an issue</Button>} />
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3"><MetricCard label="Total reports" value={reports.length} detail="Your community contributions" icon={<ClipboardList size={18} />} /><MetricCard label="Active" value={active} detail="Still moving through review" tone="amber" /><MetricCard label="Resolved" value={resolved} detail="Closed with a recorded outcome" tone="green" /></div>
        <section className="mt-12">
          <div className="flex flex-col gap-4 border-b border-[#d8d6cf] pb-5 md:flex-row md:items-end md:justify-between"><div><p className="civic-kicker">Activity</p><h2 className="mt-1 font-headline-md text-headline-md font-bold tracking-[-0.04em] text-on-surface">Your issue history</h2></div><label className="flex items-center gap-2 text-xs font-extrabold text-on-surface-variant"><Filter size={15} /><span className="sr-only">Filter reports by status</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="civic-focus h-10 rounded-xl border border-[#d8d6cf] bg-white px-3 text-xs font-bold text-primary"><option value="All">All statuses</option>{REPORT_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}</select></label></div>
          {error ? <div className="mt-6"><InlineError>{error}</InlineError></div> : filteredReports.length === 0 ? <div className="mt-6"><EmptyState icon={<ClipboardList size={34} />} title={reports.length ? "No reports in this status" : "Your civic record starts here"} description={reports.length ? "Choose another status to see more of your reports." : "Report a local issue and follow it from the first submission to its resolution."} action={!reports.length ? <Button onClick={() => window.dispatchEvent(new Event("open-new-report"))}><Plus size={17} />Create your first report</Button> : undefined} /></div> : <div className="mt-6 grid gap-4">{filteredReports.map((report) => <MyReportCard key={report.id} id={report.id} title={report.title} description={report.description} status={report.status as StatusType} date={new Date(report.updated_at || report.created_at).toLocaleDateString()} />)}</div>}
        </section>
      </div>
    </main>
  );
}
