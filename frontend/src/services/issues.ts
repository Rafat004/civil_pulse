import { supabase } from "@/lib/supabaseClient";
import type { Department, Report, ReportStatus, ReportStatusHistory } from "@/lib/types";

export async function getIssueById(id: string): Promise<Report | null> {
  const { data, error } = await supabase
    .from("reports")
    .select(`
      *,
      department:departments(*)
    `)
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }

  return data as unknown as Report;
}

export async function getReportStatusHistory(reportId: string): Promise<ReportStatusHistory[]> {
  const { data, error } = await supabase
    .from("report_status_history")
    .select("*")
    .eq("report_id", reportId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return data as ReportStatusHistory[];
}

export async function getDepartments(): Promise<Department[]> {
  const { data, error } = await supabase
    .from("departments")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw error;

  return data as Department[];
}

export interface ChangeReportStatusParams {
  reportId: string;
  newStatus: ReportStatus;
  note?: string;
  departmentId?: string;
  duplicateOf?: string;
  resolutionNote?: string;
  resolutionImageUrl?: string;
}

export async function changeReportStatus({
  reportId,
  newStatus,
  note,
  departmentId,
  duplicateOf,
  resolutionNote,
  resolutionImageUrl,
}: ChangeReportStatusParams): Promise<void> {
  // Call the trusted RPC function
  const { error: rpcError } = await supabase.rpc("change_report_status", {
    p_report_id: reportId,
    p_new_status: newStatus,
    p_note: note || null,
    p_department_id: departmentId || null,
    p_duplicate_of: duplicateOf || null,
    p_resolution_note: resolutionNote || null,
    p_resolution_image_url: resolutionImageUrl || null,
  });

  if (rpcError) {
    // Fallback if RPC function is not found in database environment
    console.warn("RPC change_report_status failed, attempting direct table update:", rpcError.message);

    const { data: { user } } = await supabase.auth.getUser();

    const updatePayload: Record<string, any> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };

    if (departmentId !== undefined) updatePayload.department_id = departmentId;
    if (duplicateOf !== undefined) updatePayload.duplicate_of = duplicateOf;
    if (newStatus === "Resolved") {
      if (resolutionNote) updatePayload.resolution_note = resolutionNote;
      if (resolutionImageUrl) updatePayload.resolution_image_url = resolutionImageUrl;
      updatePayload.resolved_at = new Date().toISOString();
    }

    const { error: updateError } = await supabase
      .from("reports")
      .update(updatePayload)
      .eq("id", reportId);

    if (updateError) throw updateError;

    // Record history
    await supabase.from("report_status_history").insert({
      report_id: reportId,
      to_status: newStatus,
      changed_by: user?.id || null,
      note: note || null,
    });
  }
}
