"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Activity, AlertCircle, Ban, BadgeCheck, CheckCircle2, ClipboardCheck, Copy, ExternalLink, History, Hourglass, MapPin, PieChart, RefreshCcw, Search, ShieldCheck, X, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/components/AuthProvider";
import StatusBadge, { StatusType } from "@/components/StatusBadge";
import { changeReportStatus, getDepartments } from "@/services/issues";
import { getAdminSummaryMetrics, getReportsForDuplicateSelection, type AdminSummaryMetrics } from "@/services/admin";
import { REPORT_CATEGORIES, REPORT_STATUSES, getValidNextStatuses } from "@/lib/constants";
import type { Department, Report, ReportStatus } from "@/lib/types";
import { Button, InlineError, MetricCard, PageHeader } from "@/components/ui";

interface ExtendedReport extends Report {
  affected_count?: number;
  confirmed_count?: number;
}

export default function ApprovalsPage() {
  const { role, loading: authLoading } = useAuth();
  const router = useRouter();

  // Data states
  const [reports, setReports] = useState<ExtendedReport[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [metrics, setMetrics] = useState<AdminSummaryMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [departmentFilter, setDepartmentFilter] = useState<string>("All");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "most_affected">("newest");

  // Modal states for Duplicate and Rejection workflows
  const [duplicateModalIssue, setDuplicateModalIssue] = useState<ExtendedReport | null>(null);
  const [candidateReports, setCandidateReports] = useState<Array<{ id: string; title: string; category: string; status: string }>>([]);
  const [selectedCanonicalId, setSelectedCanonicalId] = useState<string>("");
  const [duplicateNote, setDuplicateNote] = useState<string>("");

  const [rejectModalIssue, setRejectModalIssue] = useState<ExtendedReport | null>(null);
  const [rejectReason, setRejectReason] = useState<string>("");

  const [submittingAction, setSubmittingAction] = useState(false);

  const fetchAdminData = useCallback(async () => {
    try {
      setLoading(true);
      const [metricsData, depsData, reportsRes, reactionsRes] = await Promise.all([
        getAdminSummaryMetrics(),
        getDepartments(),
        supabase.from("reports").select("*, department:departments(*)"),
        supabase.from("report_reactions").select("report_id, type"),
      ]);

      if (reportsRes.error) throw reportsRes.error;

      const rawReports = (reportsRes.data || []) as unknown as Report[];

      // Compute reaction tallies for community signal
      const affectedMap: Record<string, number> = {};
      const confirmedMap: Record<string, number> = {};
      if (reactionsRes.data) {
        reactionsRes.data.forEach((r) => {
          if (r.type === "affected") {
            affectedMap[r.report_id] = (affectedMap[r.report_id] || 0) + 1;
          } else if (r.type === "confirmed") {
            confirmedMap[r.report_id] = (confirmedMap[r.report_id] || 0) + 1;
          }
        });
      }

      const extended = rawReports.map((r) => ({
        ...r,
        affected_count: affectedMap[r.id] || 0,
        confirmed_count: confirmedMap[r.id] || 0,
      }));

      setReports(extended);
      setDepartments(depsData);
      setMetrics(metricsData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load admin data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && role !== "admin") {
      router.push("/");
      return;
    }

    if (role === "admin") {
      void Promise.resolve().then(fetchAdminData);
    }
  }, [role, authLoading, router, fetchAdminData]);

  // Realtime updates for admin dashboard
  useEffect(() => {
    if (role !== "admin") return;

    const channel = supabase
      .channel("admin-workspace-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "reports" }, () => fetchAdminData())
      .on("postgres_changes", { event: "*", schema: "public", table: "report_status_history" }, () => fetchAdminData())
      .on("postgres_changes", { event: "*", schema: "public", table: "report_reactions" }, () => fetchAdminData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [role, fetchAdminData]);

  // Handle Direct Status Change or trigger Modal for Duplicate/Reject or redirect for Resolved
  const handleStatusSelectChange = async (issue: ExtendedReport, newStatus: ReportStatus) => {
    setActionError(null);
    if (newStatus === "Resolved") {
      router.push(`/issues/${issue.id}#admin-actions`);
      return;
    }

    if (newStatus === "Duplicate") {
      try {
        const candidates = await getReportsForDuplicateSelection(issue.id);
        setCandidateReports(candidates);
        setSelectedCanonicalId(candidates[0]?.id || "");
        setDuplicateNote("Marked as duplicate issue");
        setDuplicateModalIssue(issue);
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Failed to load duplicate candidates.");
      }
      return;
    }

    if (newStatus === "Rejected") {
      setRejectReason("");
      setRejectModalIssue(issue);
      return;
    }

    // Direct lifecycle status transition via trusted RPC
    try {
      setSubmittingAction(true);
      await changeReportStatus({
        reportId: issue.id,
        newStatus,
        note: `Status updated to ${newStatus} via Admin Workspace`,
      });
      await fetchAdminData();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to update status.");
    } finally {
      setSubmittingAction(false);
    }
  };

  // Submit Duplicate Workflow
  const handleConfirmDuplicate = async () => {
    if (!duplicateModalIssue || !selectedCanonicalId) return;
    try {
      setSubmittingAction(true);
      await changeReportStatus({
        reportId: duplicateModalIssue.id,
        newStatus: "Duplicate",
        duplicateOf: selectedCanonicalId,
        note: duplicateNote.trim() || "Marked as duplicate issue",
      });
      setDuplicateModalIssue(null);
      await fetchAdminData();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to mark the report as duplicate.");
    } finally {
      setSubmittingAction(false);
    }
  };

  // Submit Rejection Workflow
  const handleConfirmReject = async () => {
    if (!rejectModalIssue) return;
    try {
      setSubmittingAction(true);
      await changeReportStatus({
        reportId: rejectModalIssue.id,
        newStatus: "Rejected",
        note: rejectReason.trim() || "Report rejected by admin",
      });
      setRejectModalIssue(null);
      await fetchAdminData();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to reject the report.");
    } finally {
      setSubmittingAction(false);
    }
  };

  // Handle Department Assignment Change directly
  const handleDepartmentChange = async (issueId: string, currentStatus: ReportStatus, deptId: string) => {
    try {
      setSubmittingAction(true);
      await changeReportStatus({
        reportId: issueId,
        newStatus: currentStatus,
        departmentId: deptId ? deptId : null,
        clearDepartment: !deptId,
        note: deptId ? `Assigned department updated` : `Department unassigned`,
      });
      await fetchAdminData();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to update the department.");
    } finally {
      setSubmittingAction(false);
    }
  };

  // Filter & Search Logic
  const filteredReports = reports.filter((r) => {
    const matchesSearch =
      !searchQuery.trim() ||
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.zone.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "All" || r.status === statusFilter;
    const matchesCategory = categoryFilter === "All" || r.category === categoryFilter;
    const matchesDepartment =
      departmentFilter === "All" ||
      (departmentFilter === "Unassigned" ? !r.department_id : r.department_id === departmentFilter);

    return matchesSearch && matchesStatus && matchesCategory && matchesDepartment;
  });

  // Sorting
  filteredReports.sort((a, b) => {
    if (sortBy === "oldest") {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    }
    if (sortBy === "most_affected") {
      const diff = (b.affected_count || 0) - (a.affected_count || 0);
      if (diff !== 0) return diff;
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  if (authLoading || loading) {
    return <main className="civic-page"><div className="civic-container py-12"><div className="flex items-center gap-3 text-on-surface-variant"><RefreshCcw className="animate-spin text-primary" size={22} /><span className="text-sm font-bold">Loading operations workspace…</span></div></div></main>;
  }

  if (role !== "admin") return null;

  return (
    <main className="civic-page">
      <div className="civic-container flex max-w-[1400px] flex-col gap-8 py-8 md:py-12">
        {/* Workspace Title Header */}
        <PageHeader
          eyebrow="Civic operations"
          title="Admin workspace & approvals"
          description="Review community reports, assign the right team, and keep lifecycle changes visible and accountable."
          actions={<Button variant="secondary" onClick={fetchAdminData}><RefreshCcw size={15} />Refresh workspace</Button>}
        />
        <div className="-mt-4 flex items-center gap-2 text-xs font-bold text-primary">
              <ShieldCheck size={15} />
              Civic Operations Dashboard
        </div>
        {actionError && <InlineError>{actionError}</InlineError>}

        {error && (
          <InlineError><span className="inline-flex items-center gap-2"><AlertCircle size={16} />{error}</span></InlineError>
        )}

        {/* SECTION 1: Admin Overview Cards */}
        {metrics && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <MetricCard label="Total open" value={metrics.totalOpen} detail="Active unresolved issues" icon={<Activity size={18} />} />
            <MetricCard label="Reported" value={metrics.reportedCount} detail="Awaiting verification" tone="amber" icon={<ClipboardCheck size={18} />} />
            <MetricCard label="Verified" value={metrics.verifiedCount} detail="Confirmed by community" tone="blue" icon={<CheckCircle2 size={18} />} />
            <MetricCard label="In progress" value={metrics.inProgressCount} detail="Work underway" tone="amber" icon={<Activity size={18} />} />
            <MetricCard label="Resolved" value={metrics.resolvedCount} detail="Completed maintenance" tone="green" icon={<CheckCircle2 size={18} />} />
          </div>
        )}

        {/* SECTION 2: Analytics & Operational Activity Grid */}
        {metrics && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg">
            {/* Recent Activity Timeline */}
            <div className="lg:col-span-6 glass-card bg-surface/60 border border-outline-variant rounded-2xl p-md md:p-lg flex flex-col gap-md shadow-md">
              <h2 className="font-headline-md text-headline-md text-on-surface font-bold flex items-center gap-2">
                <History className="text-primary" size={20} />
                Recent Operations Activity
              </h2>
              <div className="flex flex-col gap-3">
                {metrics.recentActivity.length === 0 ? (
                  <p className="text-xs text-on-surface-variant italic py-2">No recent activity logged.</p>
                ) : (
                  metrics.recentActivity.map((act) => (
                    <div
                      key={act.id}
                      className="p-3 bg-surface/50 border border-outline-variant/50 rounded-xl flex flex-col gap-1 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Link
                          href={`/issues/${act.report_id}`}
                          className="font-bold text-on-surface hover:text-primary transition-colors truncate max-w-[240px]"
                        >
                          {act.title}
                        </Link>
                        <span className="text-[10px] text-on-surface-variant">
                          {new Date(act.created_at).toLocaleDateString()}{" "}
                          {new Date(act.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-on-surface-variant">Transition:</span>
                        <StatusBadge status={act.to_status as StatusType} />
                      </div>
                      {act.note && <p className="text-on-surface-variant italic font-mono text-[11px]">&quot;{act.note}&quot;</p>}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Category Distribution & Oldest Unresolved */}
            <div className="lg:col-span-6 flex flex-col gap-lg">
              {/* Category Breakdown */}
              <div className="glass-card bg-surface/60 border border-outline-variant rounded-2xl p-md flex flex-col gap-sm shadow-md">
                <h3 className="font-label-md text-label-md font-bold text-on-surface uppercase tracking-wider flex items-center gap-2">
                  <PieChart className="text-primary" size={20} />
                  Issue Categories Breakdown
                </h3>
                <div className="flex flex-wrap gap-2 pt-xs">
                  {Object.entries(metrics.categoryCounts).length === 0 ? (
                    <span className="text-xs text-on-surface-variant italic">No categorization data.</span>
                  ) : (
                    Object.entries(metrics.categoryCounts).map(([cat, cnt]) => (
                      <span
                        key={cat}
                        className="px-3 py-1.5 bg-surface-bright text-on-surface text-xs rounded-xl border border-outline-variant flex items-center gap-2"
                      >
                        <span className="font-semibold">{cat}</span>
                        <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold text-[10px]">
                          {cnt}
                        </span>
                      </span>
                    ))
                  )}
                </div>
              </div>

              {/* Oldest Unresolved Issues */}
              <div className="glass-card bg-surface/60 border border-outline-variant rounded-2xl p-md flex flex-col gap-sm shadow-md flex-grow">
                <h3 className="font-label-md text-label-md font-bold text-on-surface uppercase tracking-wider flex items-center gap-2">
                <Hourglass className="text-[#b87924]" size={20} />
                  Oldest Unresolved Reports
                </h3>
                <div className="flex flex-col gap-2 pt-xs">
                  {metrics.oldestUnresolved.length === 0 ? (
                    <span className="text-xs text-on-surface-variant italic">All reports resolved!</span>
                  ) : (
                    metrics.oldestUnresolved.map((ur) => (
                      <div
                        key={ur.id}
                        className="p-2.5 bg-surface/40 border border-outline-variant/40 rounded-xl flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="flex flex-col truncate">
                          <Link href={`/issues/${ur.id}`} className="font-bold text-on-surface hover:text-primary transition-colors truncate">
                            {ur.title}
                          </Link>
                          <span className="text-[10px] text-on-surface-variant">
                            Zone: {ur.zone} • Reported {new Date(ur.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <StatusBadge status={ur.status} />
                          <Link
                            href={`/issues/${ur.id}`}
                            className="p-1 text-on-surface-variant hover:text-primary transition-colors"
                            title="Open Issue Detail"
                          >
                            <ExternalLink size={18} />
                          </Link>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 3: Admin Report Management & Controls */}
        <div className="glass-card bg-surface/60 border border-outline-variant rounded-2xl p-md md:p-lg flex flex-col gap-md shadow-md">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-md border-b border-outline-variant/60 pb-md">
            <h2 className="font-headline-md text-headline-md text-on-surface font-bold flex items-center gap-2">
              <Search className="text-primary" size={20} />
              Report Lifecycle Workspace ({filteredReports.length})
            </h2>

            {/* Controls Bar: Search, Status, Category, Department, Sorting */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex flex-wrap items-center gap-sm w-full lg:w-auto">
              {/* Search input */}
              <div className="relative flex-grow sm:w-60">
                <Search className="absolute left-3 top-2.5 text-on-surface-variant" size={18} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search title, zone..."
                  className="bg-surface pl-9 pr-3 py-1.5 rounded-xl border border-outline-variant text-on-surface text-xs focus:outline-none focus:border-primary w-full"
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-surface px-3 py-1.5 rounded-xl border border-outline-variant text-on-surface text-xs focus:outline-none focus:border-primary cursor-pointer font-medium"
              >
                <option value="All">All Statuses</option>
                {REPORT_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>

              {/* Category Filter */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-surface px-3 py-1.5 rounded-xl border border-outline-variant text-on-surface text-xs focus:outline-none focus:border-primary cursor-pointer font-medium"
              >
                <option value="All">All Categories</option>
                {REPORT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              {/* Department Filter */}
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="bg-surface px-3 py-1.5 rounded-xl border border-outline-variant text-on-surface text-xs focus:outline-none focus:border-primary cursor-pointer font-medium"
              >
                <option value="All">All Departments</option>
                <option value="Unassigned">Unassigned</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>

              {/* Sort By */}
              <select
                value={sortBy}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "newest" || value === "oldest" || value === "most_affected") setSortBy(value);
                }}
                className="bg-surface px-3 py-1.5 rounded-xl border border-outline-variant text-on-surface text-xs focus:outline-none focus:border-primary cursor-pointer font-medium"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="most_affected">Most Affected</option>
              </select>
            </div>
          </div>

          {/* Report Management Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface border-b border-outline-variant text-xs text-on-surface-variant uppercase tracking-wider font-semibold">
                  <th className="p-sm">Title & Details</th>
                  <th className="p-sm">Category / Zone</th>
                  <th className="p-sm">Assigned Department</th>
                  <th className="p-sm">Status</th>
                  <th className="p-sm">Community Signal</th>
                  <th className="p-sm text-right">Lifecycle Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40 text-xs">
                {filteredReports.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-xl text-center text-on-surface-variant italic">
                      No civic reports matching the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredReports.map((issue) => {
                    const validNext = getValidNextStatuses(issue.status);

                    return (
                      <tr key={issue.id} className="hover:bg-surface/50 transition-colors">
                        {/* Title & Details */}
                        <td className="p-sm max-w-[280px]">
                          <Link
                            href={`/issues/${issue.id}`}
                            className="font-bold text-on-surface hover:text-primary transition-colors text-sm line-clamp-1"
                          >
                            {issue.title}
                          </Link>
                          <p className="text-on-surface-variant text-[11px] line-clamp-1 mt-0.5">
                            {issue.description}
                          </p>
                          {issue.duplicate_of && (
                            <Link
                              href={`/issues/${issue.duplicate_of}`}
                              className="inline-flex items-center gap-1 text-[10px] text-amber-600 font-bold hover:underline mt-1 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20"
                            >
                              <Copy size={12} />
                              Duplicate of #{issue.duplicate_of.slice(0, 8)}
                            </Link>
                          )}
                        </td>

                        {/* Category & Zone */}
                        <td className="p-sm">
                          <span className="font-semibold text-on-surface block">{issue.category}</span>
                          <span className="text-[11px] text-on-surface-variant flex items-center gap-0.5 mt-0.5">
                            <MapPin size={13} />
                            {issue.zone}
                          </span>
                        </td>

                        {/* Assigned Department Selector */}
                        <td className="p-sm">
                          <select
                            disabled={submittingAction}
                            value={issue.department_id || ""}
                            onChange={(e) => handleDepartmentChange(issue.id, issue.status, e.target.value)}
                            className="bg-surface p-1.5 rounded-lg border border-outline-variant text-on-surface text-xs focus:outline-none focus:border-primary max-w-[180px] cursor-pointer"
                          >
                            <option value="">-- Unassigned --</option>
                            {departments.map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.name}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Status Badge */}
                        <td className="p-sm">
                          <StatusBadge status={issue.status} />
                        </td>

                        {/* Community Signal */}
                        <td className="p-sm">
                          <div className="flex flex-col gap-0.5 text-[11px]">
                            <span className="text-amber-600 font-semibold flex items-center gap-1">
                              <AlertTriangle size={14} />
                              Affected: {issue.affected_count || 0}
                            </span>
                            {(issue.confirmed_count || 0) > 0 && (
                              <span className="text-emerald-600 font-semibold flex items-center gap-1">
                                <BadgeCheck size={14} />
                                Confirmed: {issue.confirmed_count}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Lifecycle Action Options */}
                        <td className="p-sm text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Status Change Selector restricted to valid transitions */}
                            <select
                              disabled={submittingAction || validNext.length === 1}
                              value={issue.status}
                              onChange={(e) =>
                                handleStatusSelectChange(issue, e.target.value as ReportStatus)
                              }
                              className="bg-primary/10 text-primary px-2.5 py-1.5 rounded-lg border border-primary/20 text-xs font-semibold focus:outline-none cursor-pointer disabled:opacity-50"
                            >
                              {validNext.map((st) => (
                                <option key={st} value={st}>
                                  {st === issue.status ? `${st} (Current)` : `Move to: ${st}`}
                                </option>
                              ))}
                            </select>

                            <Link
                              href={`/issues/${issue.id}`}
                              className="p-1.5 bg-surface border border-outline-variant text-on-surface rounded-lg hover:border-primary transition-colors flex items-center justify-center"
                              title="View Full Issue Detail Workspace"
                            >
                              <ExternalLink size={18} />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL 1: Deliberate Duplicate Selection Workflow */}
      {duplicateModalIssue && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-md" role="presentation">
          <div role="dialog" aria-modal="true" aria-labelledby="duplicate-dialog-title" className="bg-surface border border-outline-variant rounded-2xl max-w-lg w-full p-md md:p-lg flex flex-col gap-md shadow-2xl">
            <div className="flex justify-between items-center border-b border-outline-variant pb-sm">
              <h3 id="duplicate-dialog-title" className="font-headline-md text-on-surface font-bold flex items-center gap-2 text-amber-600">
                <Copy size={20} />
                Mark Report as Duplicate
              </h3>
              <button
                type="button"
                onClick={() => setDuplicateModalIssue(null)}
                aria-label="Close duplicate report dialog"
                className="text-on-surface-variant hover:text-on-surface p-1"
              >
                <X size={20} />
              </button>
            </div>

            <p className="text-xs text-on-surface-variant">
              Target report: <span className="font-bold text-on-surface">&quot;{duplicateModalIssue.title}&quot;</span>
            </p>

            <div className="flex flex-col gap-xs">
              <label className="text-xs font-semibold text-on-surface">
                Select Canonical Original Report:
              </label>
              <select
                value={selectedCanonicalId}
                onChange={(e) => setSelectedCanonicalId(e.target.value)}
                className="bg-surface-container p-sm rounded-xl border border-outline-variant text-on-surface text-xs focus:outline-none focus:border-primary"
              >
                {candidateReports.length === 0 ? (
                  <option value="">No other reports available</option>
                ) : (
                  candidateReports.map((c) => (
                    <option key={c.id} value={c.id}>
                      [{c.category}] {c.title} ({c.status})
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="flex flex-col gap-xs">
              <label className="text-xs font-semibold text-on-surface">Duplicate Resolution Note:</label>
              <input
                type="text"
                value={duplicateNote}
                onChange={(e) => setDuplicateNote(e.target.value)}
                placeholder="e.g. Duplicate of existing pothole report #..."
                className="bg-surface-container p-sm rounded-xl border border-outline-variant text-on-surface text-xs focus:outline-none focus:border-primary"
              />
            </div>

            <div className="flex justify-end gap-sm pt-sm border-t border-outline-variant/40">
              <button
                type="button"
                onClick={() => setDuplicateModalIssue(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-on-surface-variant hover:bg-surface-bright"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submittingAction || !selectedCanonicalId}
                onClick={handleConfirmDuplicate}
                className="bg-amber-600 text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-amber-700 transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                {submittingAction ? "Processing..." : "Confirm Duplicate"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Rejection Reason Workflow */}
      {rejectModalIssue && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-md" role="presentation">
          <div role="dialog" aria-modal="true" aria-labelledby="reject-dialog-title" className="bg-surface border border-outline-variant rounded-2xl max-w-lg w-full p-md md:p-lg flex flex-col gap-md shadow-2xl">
            <div className="flex justify-between items-center border-b border-outline-variant pb-sm">
              <h3 id="reject-dialog-title" className="font-headline-md text-on-surface font-bold flex items-center gap-2 text-error">
                <Ban size={20} />
                Reject Report
              </h3>
              <button
                type="button"
                onClick={() => setRejectModalIssue(null)}
                aria-label="Close reject report dialog"
                className="text-on-surface-variant hover:text-on-surface p-1"
              >
                <X size={20} />
              </button>
            </div>

            <p className="text-xs text-on-surface-variant">
              Target report: <span className="font-bold text-on-surface">&quot;{rejectModalIssue.title}&quot;</span>
            </p>

            <div className="flex flex-col gap-xs">
              <label className="text-xs font-semibold text-on-surface">Rejection Reason / Admin Note:</label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="State clearly why this report is being rejected..."
                className="bg-surface-container p-sm rounded-xl border border-outline-variant text-on-surface text-xs focus:outline-none focus:border-primary resize-none"
              />
            </div>

            <div className="flex justify-end gap-sm pt-sm border-t border-outline-variant/40">
              <button
                type="button"
                onClick={() => setRejectModalIssue(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-on-surface-variant hover:bg-surface-bright"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submittingAction}
                onClick={handleConfirmReject}
                className="bg-error text-on-error px-4 py-2 rounded-xl text-xs font-semibold hover:bg-error/90 transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                {submittingAction ? "Processing..." : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
