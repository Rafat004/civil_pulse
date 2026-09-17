import { supabase } from "@/lib/supabaseClient";
import type { Comment, UserRole } from "@/lib/types";

export async function getComments(reportId: string): Promise<Comment[]> {
  const { data: commentsData, error: commentsError } = await supabase
    .from("comments")
    .select("*")
    .eq("report_id", reportId)
    .order("created_at", { ascending: true });

  if (commentsError) throw commentsError;
  if (!commentsData || commentsData.length === 0) return [];

  // Fetch author metadata safely from public_profiles view
  const userIds = Array.from(new Set(commentsData.map((c) => c.user_id)));
  const { data: profilesData } = await supabase
    .from("public_profiles")
    .select("id, full_name, role")
    .in("id", userIds);

  const profileMap = new Map<string, { full_name: string | null; role: UserRole }>();
  profilesData?.forEach((p) => {
    profileMap.set(p.id, { full_name: p.full_name || null, role: p.role as UserRole });
  });

  return commentsData.map((comment) => {
    const profile = profileMap.get(comment.user_id);
    return {
      ...comment,
      author_name: profile?.full_name || "Citizen",
      author_role: profile?.role || "civic",
    };
  }) as Comment[];
}

export async function createComment(
  reportId: string,
  userId: string,
  body: string
): Promise<Comment> {
  const { data, error } = await supabase
    .from("comments")
    .insert([{ report_id: reportId, user_id: userId, body: body.trim() }])
    .select()
    .single();

  if (error) throw error;
  return data as Comment;
}

export async function deleteComment(commentId: string): Promise<void> {
  const { error } = await supabase.from("comments").delete().eq("id", commentId);
  if (error) throw error;
}
