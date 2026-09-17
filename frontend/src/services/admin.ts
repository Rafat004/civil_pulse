import { supabase } from "@/lib/supabaseClient";
import type { Report } from "@/lib/types";

export interface AdminSummaryMetrics {
  totalOpen: number;
  reportedCount: number;
  verifiedCount: number;
  assignedCount: number;
  inProgressCount: number;
  resolvedCount: number;
  rejectedCount: number;
  duplicateCount: number;
  reopenedCount: number;
  categoryCounts: Record<string, number>;
  recentActivity: Array<{
    id: string;
    report_id: string;
    title: string;
    from_status: string | null;
    to_status: string;
    note: string | null;
    created_at: string;
  }>;
  oldestUnresolved: Report[];
}

export async function getAdminSummaryMetrics(): Promise<AdminSummaryMetrics> {
  // Fetch reports with department
  const { data: reportsData, error: reportsError } = await supabase
    .from("reports")
    .select("*, department:departments(*)");

  if (reportsError) throw reportsError;
  const reports = (reportsData || []) as unknown as Report[];

  let reportedCount = 0;
  let verifiedCount = 0;
  let assignedCount = 0;
  let inProgressCount = 0;
  let resolvedCount = 0;
  let rejectedCount = 0;
  let duplicateCount = 0;
  let reopenedCount = 0;
  const categoryCounts: Record<string, number> = {};

  reports.forEach((r) => {
    switch (r.status) {
      case "Reported":
        reportedCount++;
        break;
      case "Verified":
        verifiedCount++;
        break;
      case "Assigned":
        assignedCount++;
        break;
      case "In Progress":
        inProgressCount++;
        break;
      case "Resolved":
        resolvedCount++;
        break;
      case "Rejected":
        rejectedCount++;
        break;
      case "Duplicate":
        duplicateCount++;
        break;
      case "Reopened":
        reopenedCount++;
        break;
    }

    if (r.category) {
      categoryCounts[r.category] = (categoryCounts[r.category] || 0) + 1;
    }
  });

  const totalOpen = reportedCount + verifiedCount + assignedCount + inProgressCount + reopenedCount;

  // Oldest unresolved issues
  const unresolved = reports
    .filter((r) => !["Resolved", "Rejected", "Duplicate"].includes(r.status))
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .slice(0, 5);

  // Fetch recent activity from status history
  const { data: historyData, error: historyError } = await supabase
    .from("report_status_history")
    .select("*, report:reports(title)")
    .order("created_at", { ascending: false })
    .limit(6);

  if (historyError) throw historyError;

  const recentActivity = (historyData || []).map((h: any) => ({
    id: h.id,
    report_id: h.report_id,
    title: h.report?.title || "Report #" + h.report_id.slice(0, 6),
    from_status: h.from_status,
    to_status: h.to_status,
    note: h.note,
    created_at: h.created_at,
  }));

  return {
    totalOpen,
    reportedCount,
    verifiedCount,
    assignedCount,
    inProgressCount,
    resolvedCount,
    rejectedCount,
    duplicateCount,
    reopenedCount,
    categoryCounts,
    recentActivity,
    oldestUnresolved: unresolved,
  };
}

export async function getReportsForDuplicateSelection(currentReportId: string): Promise<Array<{ id: string; title: string; category: string; status: string }>> {
  const { data, error } = await supabase
    .from("reports")
    .select("id, title, category, status")
    .neq("id", currentReportId)
    .neq("status", "Duplicate")
    .neq("status", "Rejected")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}
