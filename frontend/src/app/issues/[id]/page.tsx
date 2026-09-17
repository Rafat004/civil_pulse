"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import StatusBadge from "@/components/StatusBadge";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabaseClient";
import { REPORT_STATUSES, getValidNextStatuses } from "@/lib/constants";
import {
  changeReportStatus,
  getDepartments,
  getIssueById,
  getReportStatusHistory,
} from "@/services/issues";
import { getReactionSummary, setReaction } from "@/services/reactions";
import { createComment, deleteComment, getComments } from "@/services/comments";
import { validateReportImage } from "@/lib/images";
import type { Comment, Department, Report, ReportStatus, ReportStatusHistory } from "@/lib/types";

const MapComponent = dynamic(() => import("@/components/MapComponent"), { ssr: false });

export default function IssueDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { user, role } = useAuth();

  const [issue, setIssue] = useState<Report | null>(null);
  const [history, setHistory] = useState<ReportStatusHistory[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Reaction state
  const [reactionSummary, setReactionSummary] = useState({
    affected: 0,
    confirmed: 0,
    currentUser: { affected: false, confirmed: false },
  });
  const [reactionLoading, setReactionLoading] = useState(false);

  // Before/After tab toggle
  const [imageTab, setImageTab] = useState<"before" | "after">("before");

  // Comments state
  const [newCommentText, setNewCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  // Admin update form state
  const [adminStatus, setAdminStatus] = useState<ReportStatus>("Reported");
  const [adminDepartmentId, setAdminDepartmentId] = useState<string>("");
  const [adminNote, setAdminNote] = useState<string>("");
  const [adminResolutionNote, setAdminResolutionNote] = useState<string>("");
  const [adminResolutionImage, setAdminResolutionImage] = useState<File | null>(null);
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState<string | null>(null);

  const fetchIssueData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const [issueData, historyData, depsData, commentsData] = await Promise.all([
        getIssueById(id),
        getReportStatusHistory(id),
        getDepartments(),
        getComments(id),
      ]);

      if (!issueData) {
        setError("Issue not found.");
        setLoading(false);
        return;
      }

      setIssue(issueData);
      setHistory(historyData);
      setDepartments(depsData);
      setComments(commentsData);
      setAdminStatus(issueData.status);
      setAdminDepartmentId(issueData.department_id || "");
      if (issueData.resolution_note) {
        setAdminResolutionNote(issueData.resolution_note);
      }

      // Reactions
      const reactions = await getReactionSummary(id, user?.id);
      setReactionSummary(reactions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load issue.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssueData();
  }, [id, user?.id]);

  // Supabase Realtime Subscriptions for comments & reactions
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`issue-realtime-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "comments", filter: `report_id=eq.${id}` },
        () => {
          getComments(id).then(setComments).catch(console.error);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "report_reactions", filter: `report_id=eq.${id}` },
        () => {
          getReactionSummary(id, user?.id).then(setReactionSummary).catch(console.error);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "report_status_history", filter: `report_id=eq.${id}` },
        () => {
          getReportStatusHistory(id).then(setHistory).catch(console.error);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, user?.id]);

  const handleToggleReaction = async (type: "affected" | "confirmed") => {
    if (!user) {
      alert("Please sign in to react to this issue.");
      return;
    }
    setReactionLoading(true);
    const currentActive = reactionSummary.currentUser[type];
    const newActive = !currentActive;

    // Optimistic UI
    setReactionSummary((prev) => ({
      ...prev,
      [type]: newActive ? prev[type] + 1 : Math.max(0, prev[type] - 1),
      currentUser: {
        ...prev.currentUser,
        [type]: newActive,
      },
    }));

    try {
      await setReaction(id, user.id, type, newActive);
    } catch (err) {
      console.error("Failed to update reaction:", err);
      // Revert on error
      setReactionSummary((prev) => ({
        ...prev,
        [type]: currentActive ? prev[type] + 1 : Math.max(0, prev[type] - 1),
        currentUser: {
          ...prev.currentUser,
          [type]: currentActive,
        },
      }));
    } finally {
      setReactionLoading(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert("Please sign in to comment.");
      return;
    }
    if (!newCommentText.trim()) return;

    setSubmittingComment(true);
    setCommentError(null);

    try {
      await createComment(id, user.id, newCommentText);
      setNewCommentText("");
      const updatedComments = await getComments(id);
      setComments(updatedComments);
    } catch (err) {
      setCommentError(err instanceof Error ? err.message : "Failed to post comment.");
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("Are you sure you want to delete this comment?")) return;
    try {
      await deleteComment(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (err) {
      alert("Failed to delete comment: " + (err instanceof Error ? err.message : "Unknown error"));
    }
  };

  const handleAdminUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || role !== "admin") return;
    setUpdating(true);
    setUpdateError(null);
    setUpdateSuccess(null);

    try {
      let resolution_image_url: string | undefined = undefined;

      if (adminStatus === "Resolved" && adminResolutionImage) {
        const valError = validateReportImage(adminResolutionImage);
        if (valError) {
          setUpdateError(valError);
          setUpdating(false);
          return;
        }

        const fileExt = adminResolutionImage.name.split(".").pop();
        const fileName = `resolution-${id}-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("reports")
          .upload(fileName, adminResolutionImage);

        if (uploadError) {
          throw new Error(`Resolution photo upload failed: ${uploadError.message}`);
        }

        const { data: publicUrlData } = supabase.storage
          .from("reports")
          .getPublicUrl(fileName);
        resolution_image_url = publicUrlData.publicUrl;
      }

      await changeReportStatus({
        reportId: id,
        newStatus: adminStatus,
        note: adminNote.trim() || undefined,
        departmentId: adminDepartmentId || undefined,
        resolutionNote: adminResolutionNote.trim() || undefined,
        resolutionImageUrl: resolution_image_url,
      });

      setUpdateSuccess("Status updated successfully!");
      setAdminNote("");
      setAdminResolutionImage(null);
      await fetchIssueData();
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : "Failed to update status.");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-background p-md md:p-xl flex items-center justify-center">
        <div className="flex items-center gap-3 text-on-surface-variant">
          <span className="material-symbols-outlined animate-spin text-2xl">sync</span>
          <span className="font-label-md">Loading issue details...</span>
        </div>
      </main>
    );
  }

  if (error || !issue) {
    return (
      <main className="min-h-screen bg-background p-md md:p-xl flex flex-col items-center justify-center gap-md">
        <div className="text-error font-headline-md">{error || "Issue not found"}</div>
        <Link href="/" className="bg-primary text-on-primary px-lg py-sm rounded-lg font-label-md">
          Return Home
        </Link>
      </main>
    );
  }

  const hasResolutionImage = Boolean(issue.resolution_image_url);
  const hasOriginalImage = Boolean(issue.image_url);

  return (
    <main className="min-h-screen bg-background p-margin-mobile md:p-margin-desktop py-lg">
      <div className="max-w-[1100px] mx-auto flex flex-col gap-lg">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-on-surface-variant">
          <Link href="/" className="hover:text-primary transition-colors flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Back to Feed
          </Link>
          <span>/</span>
          <span>Issues</span>
          <span>/</span>
          <span className="text-on-surface font-mono">{issue.id.slice(0, 8)}...</span>
        </div>

        {/* Issue Header */}
        <div className="glass-card bg-surface/60 border border-outline-variant rounded-2xl p-md md:p-lg flex flex-col gap-md shadow-md">
          <div className="flex flex-wrap items-center justify-between gap-md">
            <div className="flex flex-wrap items-center gap-xs">
              <span className="px-2.5 py-1 bg-surface-bright text-on-surface-variant text-xs font-semibold rounded-md border border-outline-variant uppercase tracking-wider">
                {issue.category}
              </span>
              {issue.department?.name && (
                <span className="px-2.5 py-1 bg-primary/10 text-primary text-xs font-medium rounded-md border border-primary/20 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">corporate_fare</span>
                  {issue.department.name}
                </span>
              )}
            </div>
            <StatusBadge status={issue.status} />
          </div>

          <h1 className="text-headline-lg font-headline-lg text-on-surface font-extrabold leading-tight">
            {issue.title}
          </h1>

          <div className="flex flex-wrap items-center gap-md text-xs text-on-surface-variant border-t border-outline-variant/40 pt-sm">
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">schedule</span>
              <span>Reported on {new Date(issue.created_at).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">pin_drop</span>
              <span>Zone: {issue.zone}</span>
            </div>
            {issue.resolved_at && (
              <div className="flex items-center gap-1 text-emerald-600 font-medium">
                <span className="material-symbols-outlined text-[16px]">task_alt</span>
                <span>Resolved on {new Date(issue.resolved_at).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg">
          {/* Left Column: Media, Description, Before/After, Map, Comments */}
          <div className="lg:col-span-8 flex flex-col gap-lg">
            {/* Before / After Evidence Image Container */}
            {(hasOriginalImage || hasResolutionImage) && (
              <div className="glass-card bg-surface/60 border border-outline-variant rounded-2xl overflow-hidden shadow-md flex flex-col">
                {hasOriginalImage && hasResolutionImage && (
                  <div className="flex border-b border-outline-variant bg-surface-container">
                    <button
                      type="button"
                      onClick={() => setImageTab("before")}
                      className={`flex-1 py-3 px-4 font-label-md text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
                        imageTab === "before"
                          ? "bg-surface border-b-2 border-primary text-primary"
                          : "text-on-surface-variant hover:text-on-surface"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">photo_camera</span>
                      Before (Reported)
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageTab("after")}
                      className={`flex-1 py-3 px-4 font-label-md text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
                        imageTab === "after"
                          ? "bg-surface border-b-2 border-emerald-500 text-emerald-600"
                          : "text-on-surface-variant hover:text-on-surface"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">verified</span>
                      After (Resolved)
                    </button>
                  </div>
                )}

                <div className="relative w-full h-[320px] md:h-[420px] bg-black/10 flex items-center justify-center overflow-hidden">
                  {hasOriginalImage && hasResolutionImage ? (
                    <img
                      src={imageTab === "before" ? issue.image_url! : issue.resolution_image_url!}
                      alt={imageTab === "before" ? "Original issue photo" : "Resolution evidence photo"}
                      className="w-full h-full object-cover"
                    />
                  ) : hasOriginalImage ? (
                    <img
                      src={issue.image_url!}
                      alt="Original issue photo"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <img
                      src={issue.resolution_image_url!}
                      alt="Resolution evidence photo"
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
              </div>
            )}

            {/* Description Card */}
            <div className="glass-card bg-surface/60 border border-outline-variant rounded-2xl p-md md:p-lg flex flex-col gap-sm shadow-md">
              <h2 className="font-headline-md text-headline-md text-on-surface font-bold">Issue Description</h2>
              <p className="font-body-md text-body-md text-on-surface-variant whitespace-pre-wrap leading-relaxed">
                {issue.description}
              </p>
            </div>

            {/* Resolution Note Card (if present) */}
            {issue.resolution_note && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-md md:p-lg flex flex-col gap-sm">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold font-headline-md">
                  <span className="material-symbols-outlined">check_circle</span>
                  Resolution Note
                </div>
                <p className="text-body-md text-on-surface whitespace-pre-wrap leading-relaxed">
                  {issue.resolution_note}
                </p>
              </div>
            )}

            {/* Location & Mini Map Card */}
            <div className="glass-card bg-surface/60 border border-outline-variant rounded-2xl p-md md:p-lg flex flex-col gap-md shadow-md">
              <div className="flex justify-between items-center">
                <h2 className="font-headline-md text-headline-md text-on-surface font-bold flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">location_on</span>
                  Location Evidence
                </h2>
                <span className="text-xs text-on-surface-variant font-mono">
                  {issue.lat.toFixed(4)}, {issue.lng.toFixed(4)}
                </span>
              </div>
              <div className="h-[280px] rounded-xl overflow-hidden border border-outline-variant relative">
                <MapComponent
                  mapId={`issue-detail-map-${issue.id}`}
                  interactive={false}
                  selectedLocation={{ lat: issue.lat, lng: issue.lng }}
                  markers={[
                    {
                      id: issue.id,
                      lat: issue.lat,
                      lng: issue.lng,
                      title: issue.title,
                      status: issue.status,
                      image_url: issue.image_url || undefined,
                    },
                  ]}
                />
              </div>
            </div>

            {/* Community Comments Section */}
            <div className="glass-card bg-surface/60 border border-outline-variant rounded-2xl p-md md:p-lg flex flex-col gap-md shadow-md">
              <h2 className="font-headline-md text-headline-md text-on-surface font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">chat</span>
                Public Discussion ({comments.length})
              </h2>

              {/* Comments List */}
              <div className="flex flex-col gap-sm">
                {comments.length === 0 ? (
                  <p className="text-sm text-on-surface-variant py-sm italic">
                    No comments yet. Be the first to share an update or question!
                  </p>
                ) : (
                  comments.map((comment) => {
                    const isOfficial = comment.author_role === "admin";
                    const canDelete = user?.id === comment.user_id || role === "admin";

                    return (
                      <div
                        key={comment.id}
                        className={`p-sm md:p-md rounded-xl border flex flex-col gap-xs ${
                          isOfficial
                            ? "bg-primary/5 border-primary/30"
                            : "bg-surface/50 border-outline-variant/60"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-label-md text-xs font-bold text-on-surface">
                              {isOfficial ? "Official Response" : "Community Member"}
                            </span>
                            {isOfficial && (
                              <span className="bg-primary text-on-primary text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                <span className="material-symbols-outlined text-[12px]">verified</span>
                                Official
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-on-surface-variant">
                              {new Date(comment.created_at).toLocaleDateString()} {new Date(comment.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                            {canDelete && (
                              <button
                                onClick={() => handleDeleteComment(comment.id)}
                                className="text-error/70 hover:text-error transition-colors p-1"
                                title="Delete comment"
                              >
                                <span className="material-symbols-outlined text-[16px]">delete</span>
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-on-surface whitespace-pre-wrap leading-relaxed">
                          {comment.body}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>

              {/* New Comment Input */}
              <form onSubmit={handleAddComment} className="flex flex-col gap-sm border-t border-outline-variant/40 pt-md mt-xs">
                {commentError && (
                  <div className="p-xs bg-error/10 text-error text-xs rounded border border-error/20">
                    {commentError}
                  </div>
                )}
                <div className="flex gap-sm items-start">
                  <textarea
                    rows={2}
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    placeholder={user ? "Add a public comment or update..." : "Please sign in to post a comment."}
                    disabled={!user || submittingComment}
                    className="flex-grow bg-surface p-sm rounded-xl border border-outline-variant text-on-surface text-sm focus:outline-none focus:border-primary resize-none disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={!user || submittingComment || !newCommentText.trim()}
                    className="bg-primary text-on-primary px-md py-2.5 rounded-xl font-label-md text-xs font-semibold hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1 h-10 flex-shrink-0"
                  >
                    {submittingComment ? (
                      <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
                    ) : (
                      <span className="material-symbols-outlined text-[16px]">send</span>
                    )}
                    <span>Post</span>
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Right Column: Reactions, Timeline, Admin Actions */}
          <div className="lg:col-span-4 flex flex-col gap-lg">
            {/* Civic Reactions Widget */}
            <div className="glass-card bg-surface/60 border border-outline-variant rounded-2xl p-md flex flex-col gap-md shadow-md">
              <h3 className="font-label-md text-label-md font-bold text-on-surface uppercase tracking-wider">
                Community Confirmation
              </h3>
              <div className="grid grid-cols-2 gap-sm">
                <button
                  type="button"
                  disabled={reactionLoading}
                  onClick={() => handleToggleReaction("affected")}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                    reactionSummary.currentUser.affected
                      ? "bg-amber-500/15 border-amber-500 text-amber-700 dark:text-amber-400 font-semibold"
                      : "bg-surface border-outline-variant text-on-surface-variant hover:border-amber-500/50"
                  }`}
                >
                  <span className="material-symbols-outlined text-xl">warning</span>
                  <span className="text-xs">I'm Affected</span>
                  <span className="text-sm font-bold">{reactionSummary.affected}</span>
                </button>

                <button
                  type="button"
                  disabled={reactionLoading}
                  onClick={() => handleToggleReaction("confirmed")}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                    reactionSummary.currentUser.confirmed
                      ? "bg-emerald-500/15 border-emerald-500 text-emerald-700 dark:text-emerald-400 font-semibold"
                      : "bg-surface border-outline-variant text-on-surface-variant hover:border-emerald-500/50"
                  }`}
                >
                  <span className="material-symbols-outlined text-xl">verified</span>
                  <span className="text-xs">I Can Confirm</span>
                  <span className="text-sm font-bold">{reactionSummary.confirmed}</span>
                </button>
              </div>
            </div>

            {/* Persistent Status History Timeline */}
            <div className="glass-card bg-surface/60 border border-outline-variant rounded-2xl p-md md:p-lg flex flex-col gap-md shadow-md">
              <h3 className="font-headline-md text-headline-md text-on-surface font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">history</span>
                Lifecycle History
              </h3>

              <div className="flex flex-col gap-4 relative pl-4 border-l-2 border-outline-variant/60 ml-2 py-2">
                {history.length > 0 ? (
                  history.map((item, index) => (
                    <div key={item.id || index} className="relative flex flex-col gap-1">
                      {/* Circle indicator */}
                      <div className="absolute -left-[23px] top-1 w-3.5 h-3.5 rounded-full bg-primary border-2 border-surface" />
                      <div className="flex items-center justify-between gap-2">
                        <StatusBadge status={item.to_status} />
                        <span className="text-[10px] text-on-surface-variant">
                          {new Date(item.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {item.note && (
                        <p className="text-xs text-on-surface-variant italic mt-0.5">
                          "{item.note}"
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="relative flex flex-col gap-1">
                    <div className="absolute -left-[23px] top-1 w-3.5 h-3.5 rounded-full bg-tertiary border-2 border-surface" />
                    <StatusBadge status={issue.status} />
                    <span className="text-xs text-on-surface-variant">
                      Report submitted on {new Date(issue.created_at).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Admin Management Panel (Only visible to Admin role) */}
            {role === "admin" && (
              <div className="bg-primary/5 border border-primary/20 rounded-2xl p-md md:p-lg flex flex-col gap-md shadow-md">
                <div className="flex items-center gap-2 text-primary font-bold font-headline-md">
                  <span className="material-symbols-outlined">admin_panel_settings</span>
                  Admin Status Workflow
                </div>

                {updateError && (
                  <div className="p-sm bg-error/10 text-error text-xs rounded-lg border border-error/20">
                    {updateError}
                  </div>
                )}

                {updateSuccess && (
                  <div className="p-sm bg-emerald-500/10 text-emerald-600 text-xs rounded-lg border border-emerald-500/20">
                    {updateSuccess}
                  </div>
                )}

                <form onSubmit={handleAdminUpdateSubmit} className="flex flex-col gap-md">
                  <div className="flex flex-col gap-xs">
                    <label className="text-xs font-semibold text-on-surface-variant">Lifecycle Status</label>
                    <select
                      value={adminStatus}
                      onChange={(e) => setAdminStatus(e.target.value as ReportStatus)}
                      className="bg-surface p-sm rounded-lg border border-outline-variant text-on-surface text-sm focus:outline-none focus:border-primary"
                    >
                      {getValidNextStatuses(issue.status).map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-xs">
                    <label className="text-xs font-semibold text-on-surface-variant">Assigned Department</label>
                    <select
                      value={adminDepartmentId}
                      onChange={(e) => setAdminDepartmentId(e.target.value)}
                      className="bg-surface p-sm rounded-lg border border-outline-variant text-on-surface text-sm focus:outline-none focus:border-primary"
                    >
                      <option value="">-- Select Department --</option>
                      {departments.map((dep) => (
                        <option key={dep.id} value={dep.id}>
                          {dep.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-xs">
                    <label className="text-xs font-semibold text-on-surface-variant">Status Update Note</label>
                    <input
                      type="text"
                      value={adminNote}
                      onChange={(e) => setAdminNote(e.target.value)}
                      placeholder="e.g. Dispatched inspection crew..."
                      className="bg-surface p-sm rounded-lg border border-outline-variant text-on-surface text-sm focus:outline-none focus:border-primary"
                    />
                  </div>

                  {adminStatus === "Resolved" && (
                    <div className="flex flex-col gap-md pt-xs border-t border-outline-variant/40">
                      <div className="flex flex-col gap-xs">
                        <label className="text-xs font-semibold text-on-surface-variant">Resolution Note</label>
                        <textarea
                          rows={2}
                          value={adminResolutionNote}
                          onChange={(e) => setAdminResolutionNote(e.target.value)}
                          placeholder="Detail how the issue was fixed..."
                          className="bg-surface p-sm rounded-lg border border-outline-variant text-on-surface text-sm focus:outline-none focus:border-primary resize-none"
                        />
                      </div>

                      <div className="flex flex-col gap-xs">
                        <label className="text-xs font-semibold text-on-surface-variant">Resolution Photo (After Evidence)</label>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={(e) => setAdminResolutionImage(e.target.files?.[0] || null)}
                          className="text-xs text-on-surface-variant file:mr-2 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:bg-primary/10 file:text-primary cursor-pointer"
                        />
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={updating}
                    className="bg-primary text-on-primary py-sm rounded-lg font-label-md text-sm font-semibold hover:bg-primary/90 transition-colors shadow-md disabled:opacity-50 flex items-center justify-center gap-2 mt-xs"
                  >
                    {updating ? (
                      <>
                        <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
                        Updating Status...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[16px]">save</span>
                        Save Status Changes
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
