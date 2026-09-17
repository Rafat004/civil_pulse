import { supabase } from "@/lib/supabaseClient";

export async function followReport(reportId: string, userId: string): Promise<void> {
  const { error } = await supabase.from("report_followers").insert({
    report_id: reportId,
    user_id: userId,
  });
  if (error) throw error;
}

export async function unfollowReport(reportId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from("report_followers")
    .delete()
    .eq("report_id", reportId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function isFollowingReport(reportId: string, userId?: string): Promise<boolean> {
  if (!userId) return false;
  const { data, error } = await supabase
    .from("report_followers")
    .select("id")
    .eq("report_id", reportId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}

export async function getFollowerCount(reportId: string): Promise<number> {
  const { data, error } = await supabase.rpc("get_follower_count", {
    p_report_id: reportId,
  });

  if (error) throw error;
  return data || 0;
}
