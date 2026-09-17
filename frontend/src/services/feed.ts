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

  // Attach reaction counts to all returned reports
  const reportIds = reports.map((r) => r.id);
  const affectedCountMap: Record<string, number> = {};
  const confirmedCountMap: Record<string, number> = {};

  if (reportIds.length > 0) {
    const { data: reactionsData, error: reactionsError } = await supabase
      .from("report_reactions")
      .select("report_id, type")
      .in("report_id", reportIds);

    if (reactionsError) throw reactionsError;

    if (reactionsData) {
      reactionsData.forEach((r) => {
        if (r.type === "affected") {
          affectedCountMap[r.report_id] = (affectedCountMap[r.report_id] || 0) + 1;
        } else if (r.type === "confirmed") {
          confirmedCountMap[r.report_id] = (confirmedCountMap[r.report_id] || 0) + 1;
        }
      });
    }
  }

  reports = reports.map((r) => ({
    ...r,
    affected_count: affectedCountMap[r.id] || 0,
    confirmed_count: confirmedCountMap[r.id] || 0,
  }));

  if (sort === "Most Affected") {
    reports.sort((a, b) => {
      const countA = (a as any).affected_count || 0;
      const countB = (b as any).affected_count || 0;
      if (countB !== countA) {
        return countB - countA;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }

  return reports;
}
