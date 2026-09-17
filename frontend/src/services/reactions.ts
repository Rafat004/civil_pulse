import { REACTION_TYPES } from "@/lib/constants";
import { supabase } from "@/lib/supabaseClient";
import type { ReactionSummary, ReactionType } from "@/lib/types";

export async function getReactionSummary(
  reportId: string,
  currentUserId?: string,
): Promise<ReactionSummary> {
  const { data, error } = await supabase
    .from("report_reactions")
    .select("user_id, type")
    .eq("report_id", reportId);

  if (error) throw error;

  const summary: ReactionSummary = {
    affected: 0,
    confirmed: 0,
    currentUser: { affected: false, confirmed: false },
  };

  for (const reaction of data ?? []) {
    const type = reaction.type as ReactionType;
    if (!REACTION_TYPES.includes(type)) continue;
    summary[type] += 1;
    if (reaction.user_id === currentUserId) summary.currentUser[type] = true;
  }

  return summary;
}

export async function setReaction(
  reportId: string,
  userId: string,
  type: ReactionType,
  active: boolean,
) {
  if (active) {
    const { error } = await supabase.from("report_reactions").upsert(
      { report_id: reportId, user_id: userId, type },
      { onConflict: "report_id,user_id,type" },
    );
    if (error) throw error;
    return;
  }

  const { error } = await supabase
    .from("report_reactions")
    .delete()
    .eq("report_id", reportId)
    .eq("user_id", userId)
    .eq("type", type);

  if (error) throw error;
}
