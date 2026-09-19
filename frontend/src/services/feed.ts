import { supabase } from "@/lib/supabaseClient";
import type { Report } from "@/lib/types";

export type FeedSortOption = "Latest" | "Most Affected" | "Recently Updated";

export async function getPublicFeed(
  sort: FeedSortOption = "Latest",
  categoryFilter?: string
): Promise<Report[]> {
  let query = supabase
    .from("reports")
    .select(`
      *,
      department:departments(*)
    `);

  if (categoryFilter && categoryFilter !== "All") {
    query = query.eq("category", categoryFilter);
  }

  if (sort === "Recently Updated") {
    query = query.order("updated_at", { ascending: false });
  } else if (sort === "Latest") {
    query = query.order("created_at", { ascending: false });
  }

  const { data, error } = await query;
  if (error) throw error;

  let reports = (data || []) as unknown as Report[];

  // Attach public context to all returned reports in a small number of reads.
  const reportIds = reports.map((r) => r.id);
  const affectedCountMap: Record<string, number> = {};
  const confirmedCountMap: Record<string, number> = {};
  const commentCountMap: Record<string, number> = {};
  const latestUpdateMap: Record<string, { note: string | null; created_at: string }> = {};
  const reporterMap = new Map<string, { full_name: string | null; role: string | null }>();

  if (reportIds.length > 0) {
    const [reactionsResult, commentsResult, historyResult, profilesResult] = await Promise.all([
      supabase.from("report_reactions").select("report_id, type").in("report_id", reportIds),
      supabase.from("comments").select("report_id").in("report_id", reportIds),
      supabase.from("report_status_history").select("report_id, to_status, note, created_at").in("report_id", reportIds).order("created_at", { ascending: false }),
      supabase.from("public_profiles").select("id, full_name, role").in("id", reports.map((report) => report.user_id)),
    ]);

    if (reactionsResult.error) throw reactionsResult.error;
    if (commentsResult.error) throw commentsResult.error;
    if (historyResult.error) throw historyResult.error;
    if (profilesResult.error) throw profilesResult.error;

    for (const r of reactionsResult.data ?? []) {
        if (r.type === "affected") {
          affectedCountMap[r.report_id] = (affectedCountMap[r.report_id] || 0) + 1;
        } else if (r.type === "confirmed") {
          confirmedCountMap[r.report_id] = (confirmedCountMap[r.report_id] || 0) + 1;
        }
    }
    for (const comment of commentsResult.data ?? []) {
      commentCountMap[comment.report_id] = (commentCountMap[comment.report_id] || 0) + 1;
    }
    for (const update of historyResult.data ?? []) {
      if (!latestUpdateMap[update.report_id]) {
        latestUpdateMap[update.report_id] = { note: update.note, created_at: update.created_at };
      }
    }
    for (const profile of profilesResult.data ?? []) {
      reporterMap.set(profile.id, { full_name: profile.full_name, role: profile.role });
    }
  }

  reports = reports.map((r) => ({
    ...r,
    affected_count: affectedCountMap[r.id] || 0,
    confirmed_count: confirmedCountMap[r.id] || 0,
    comment_count: commentCountMap[r.id] || 0,
    reporter_name: reporterMap.get(r.user_id)?.full_name || null,
    reporter_role: (reporterMap.get(r.user_id)?.role as Report["reporter_role"]) || null,
    latest_update_note: latestUpdateMap[r.id]?.note || null,
    latest_update_at: latestUpdateMap[r.id]?.created_at || null,
  }));

  if (sort === "Most Affected") {
    reports.sort((a, b) => {
      const countA = a.affected_count || 0;
      const countB = b.affected_count || 0;
      if (countB !== countA) {
        return countB - countA;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }

  return reports;
}
