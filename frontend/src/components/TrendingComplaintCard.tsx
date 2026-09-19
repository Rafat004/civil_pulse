"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, BadgeCheck, Bell, Check, MapPin, MessageCircle, ShieldCheck, ThumbsUp } from "lucide-react";
import { useAuth } from "./AuthProvider";
import { CategoryLabel, StatusPill } from "./ui";
import { getReactionSummary, setReaction } from "@/services/reactions";
import { followReport, isFollowingReport, unfollowReport } from "@/services/following";
import type { ReactionType, ReportStatus } from "@/lib/types";

interface TrendingComplaintCardProps {
  id: string;
  category: string;
  title: string;
  description: string;
  zone: string;
  status: ReportStatus;
  affectedCount?: number;
  confirmedCount?: number;
  commentCount?: number;
  imageUrl?: string;
  resolutionImageUrl?: string;
  reporterName?: string | null;
  reporterRole?: string | null;
  createdAt: string;
  latestUpdateNote?: string | null;
  latestUpdateAt?: string | null;
}

function formatRelativeTime(value: string) {
  const seconds = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(value));
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

export default function TrendingComplaintCard({
  id, category, title, description, zone, status, affectedCount: initialAffectedCount = 0,
  confirmedCount: initialConfirmedCount = 0, commentCount = 0, imageUrl, resolutionImageUrl,
  reporterName, reporterRole, createdAt, latestUpdateNote, latestUpdateAt,
}: TrendingComplaintCardProps) {
  const { user } = useAuth();
  const [affectedCount, setAffectedCount] = useState(initialAffectedCount);
  const [confirmedCount, setConfirmedCount] = useState(initialConfirmedCount);
  const [hasAffected, setHasAffected] = useState(false);
  const [hasConfirmed, setHasConfirmed] = useState(false);
  const [following, setFollowing] = useState(false);
  const [busyReaction, setBusyReaction] = useState<ReactionType | null>(null);
  const [followLoading, setFollowLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([getReactionSummary(id, user?.id), isFollowingReport(id, user?.id)])
      .then(([summary, isFollowing]) => {
        if (!active) return;
        setAffectedCount(summary.affected);
        setConfirmedCount(summary.confirmed);
        setHasAffected(summary.currentUser.affected);
        setHasConfirmed(summary.currentUser.confirmed);
        setFollowing(isFollowing);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [id, user?.id]);

  const reporter = reporterName || "Community citizen";
  const reporterLabel = reporterRole === "admin" ? "Civic Pulse team" : "reported an issue";
  const avatarText = useMemo(() => initials(reporter), [reporter]);
  const isResolved = status === "Resolved";

  const handleReaction = async (type: ReactionType) => {
    setActionError(null);
    if (!user) { setActionError("Sign in to add your civic signal."); return; }
    const isActive = type === "affected" ? hasAffected : hasConfirmed;
    const nextActive = !isActive;
    setBusyReaction(type);
    if (type === "affected") {
      setHasAffected(nextActive);
      setAffectedCount((count) => nextActive ? count + 1 : Math.max(0, count - 1));
    } else {
      setHasConfirmed(nextActive);
      setConfirmedCount((count) => nextActive ? count + 1 : Math.max(0, count - 1));
    }
    try {
      await setReaction(id, user.id, type, nextActive);
    } catch (error) {
      if (type === "affected") {
        setHasAffected(isActive);
        setAffectedCount((count) => nextActive ? Math.max(0, count - 1) : count + 1);
      } else {
        setHasConfirmed(isActive);
        setConfirmedCount((count) => nextActive ? Math.max(0, count - 1) : count + 1);
      }
      setActionError(error instanceof Error ? error.message : "Unable to save your civic signal.");
    } finally { setBusyReaction(null); }
  };

  const handleFollow = async () => {
    setActionError(null);
    if (!user) { setActionError("Sign in to follow this issue."); return; }
    const nextFollowing = !following;
    setFollowing(nextFollowing);
    setFollowLoading(true);
    try {
      if (nextFollowing) await followReport(id, user.id);
      else await unfollowReport(id, user.id);
    } catch (error) {
      setFollowing(!nextFollowing);
      setActionError(error instanceof Error ? error.message : "Unable to update follow state.");
    } finally { setFollowLoading(false); }
  };

  return (
    <article className="civic-surface overflow-hidden bg-white/90 shadow-[0_12px_34px_rgba(23,37,53,0.07)]">
      <div className="p-5 sm:p-6">
        <header className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#eee8dc] text-xs font-extrabold text-primary">{avatarText}</span>
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold text-on-surface">{reporter}</p>
              <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-on-surface-variant"><span>{reporterLabel}</span><span aria-hidden="true">·</span><time dateTime={createdAt}>{formatRelativeTime(createdAt)}</time></p>
            </div>
          </div>
          <Link href={`/issues/${id}`} className="civic-focus inline-flex shrink-0 rounded-lg p-2 text-on-surface-variant hover:bg-[#f0eee8] hover:text-primary" aria-label={`Open ${title}`}><ArrowUpRight size={18} /></Link>
        </header>

        <div className="mt-5 flex flex-wrap items-center gap-2"><CategoryLabel category={category} /><StatusPill status={status} /><span className="inline-flex items-center gap-1 text-xs font-semibold text-on-surface-variant"><MapPin size={13} />{zone}</span></div>
        <Link href={`/issues/${id}`} className="civic-focus mt-4 block rounded-lg"><h2 className="font-headline-md text-[1.45rem] font-extrabold leading-tight tracking-[-0.045em] text-primary hover:text-[#9a6119] sm:text-[1.65rem]">{title}</h2></Link>
        <p className="mt-3 text-[0.95rem] leading-7 text-on-surface-variant">{description}</p>

        {imageUrl && !(isResolved && resolutionImageUrl) && <Link href={`/issues/${id}`} className="civic-focus mt-5 block overflow-hidden rounded-xl bg-[#eee8dc]"><img src={imageUrl} alt={`Evidence for ${title}`} className="max-h-[30rem] w-full object-cover" /></Link>}
        {isResolved && imageUrl && resolutionImageUrl && <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-[#f5f3ee] p-2"><div className="overflow-hidden rounded-lg"><img src={imageUrl} alt="Before resolution" className="aspect-[4/3] w-full object-cover" /><p className="px-2 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.08em] text-on-surface-variant">Before</p></div><div className="overflow-hidden rounded-lg"><img src={resolutionImageUrl} alt="After resolution" className="aspect-[4/3] w-full object-cover" /><p className="px-2 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#39704a]">After</p></div></div>}

        {(latestUpdateNote || (status !== "Reported" && status !== "Rejected" && status !== "Duplicate")) && <div className="mt-5 rounded-xl border border-[#c8dcec] bg-[#f2f7fb] p-4"><div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.08em] text-[#2c5e86]"><ShieldCheck size={15} />Official update</div><p className="mt-2 text-sm leading-6 text-[#31516b]">{latestUpdateNote || `This issue is now ${status.toLowerCase()}.`}</p>{latestUpdateAt && <time dateTime={latestUpdateAt} className="mt-2 block text-[11px] text-[#57758e]">{formatRelativeTime(latestUpdateAt)}</time>}</div>}
        {actionError && <p role="alert" className="mt-4 rounded-lg bg-[#fff1ef] px-3 py-2 text-xs leading-5 text-[#9a3d38]">{actionError}</p>}

        <footer className="mt-5 flex flex-wrap items-center gap-2 border-t border-[#e4e1d9] pt-4">
          <button type="button" onClick={() => void handleReaction("affected")} disabled={busyReaction !== null} aria-pressed={hasAffected} className={`civic-focus inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 text-xs font-extrabold transition-colors ${hasAffected ? "border-[#efc98d] bg-[#fff3df] text-[#8c5a13]" : "border-[#d8d6cf] bg-white text-on-surface-variant hover:border-[#efc98d] hover:text-[#8c5a13]"}`}><ThumbsUp size={15} /> Affected <span className="tabular-nums">{affectedCount}</span></button>
          <button type="button" onClick={() => void handleReaction("confirmed")} disabled={busyReaction !== null} aria-pressed={hasConfirmed} className={`civic-focus inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 text-xs font-extrabold transition-colors ${hasConfirmed ? "border-[#b9ddc1] bg-[#e8f4eb] text-[#39704a]" : "border-[#d8d6cf] bg-white text-on-surface-variant hover:border-[#b9ddc1] hover:text-[#39704a]"}`}>{hasConfirmed ? <Check size={15} /> : <BadgeCheck size={15} />} Confirmed <span className="tabular-nums">{confirmedCount}</span></button>
          <Link href={`/issues/${id}#comments`} className="civic-focus inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-xs font-extrabold text-on-surface-variant hover:bg-[#f0eee8] hover:text-primary"><MessageCircle size={15} /> Comments <span className="tabular-nums">{commentCount}</span></Link>
          <button type="button" onClick={() => void handleFollow()} disabled={followLoading} aria-pressed={following} className={`civic-focus ml-auto inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-xs font-extrabold transition-colors ${following ? "bg-[#eee8dc] text-primary" : "text-on-surface-variant hover:bg-[#f0eee8] hover:text-primary"}`}><Bell size={15} fill={following ? "currentColor" : "none"} /> {following ? "Following" : "Follow"}</button>
        </footer>
      </div>
    </article>
  );
}
