"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, BadgeCheck, MapPin, ThumbsUp } from "lucide-react";
import StatusBadge, { StatusType } from "./StatusBadge";
import { CategoryLabel } from "./ui";
import { useAuth } from "./AuthProvider";
import { getReactionSummary, setReaction } from "@/services/reactions";

interface TrendingComplaintCardProps {
  id: string;
  category: string;
  title: string;
  description: string;
  zone: string;
  status: StatusType;
  affectedCount?: number;
  confirmedCount?: number;
  imageUrl?: string;
}

export default function TrendingComplaintCard({ id, category, title, description, zone, status: initialStatus, affectedCount: initialAffectedCount = 0, confirmedCount: initialConfirmedCount = 0, imageUrl }: TrendingComplaintCardProps) {
  const { user } = useAuth();
  const [affectedCount, setAffectedCount] = useState(initialAffectedCount);
  const [confirmedCount, setConfirmedCount] = useState(initialConfirmedCount);
  const [hasAffected, setHasAffected] = useState(false);
  const [reactionError, setReactionError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getReactionSummary(id, user?.id).then((summary) => {
      if (!active) return;
      setAffectedCount(summary.affected);
      setConfirmedCount(summary.confirmed);
      setHasAffected(summary.currentUser.affected);
    }).catch(() => undefined);
    return () => { active = false; };
  }, [id, user?.id]);

  const handleAffectedToggle = async () => {
    setReactionError(null);
    if (!user) {
      setReactionError("Sign in to mark this issue as affected.");
      return;
    }
    const nextActive = !hasAffected;
    setHasAffected(nextActive);
    setAffectedCount((count) => nextActive ? count + 1 : Math.max(0, count - 1));
    try {
      await setReaction(id, user.id, "affected", nextActive);
    } catch (err) {
      setHasAffected(!nextActive);
      setAffectedCount((count) => nextActive ? Math.max(0, count - 1) : count + 1);
      setReactionError(err instanceof Error ? err.message : "Unable to save your reaction.");
    }
  };

  return (
    <article className="civic-surface group relative flex min-h-[230px] flex-col overflow-hidden p-5 transition-transform hover:-translate-y-0.5 hover:shadow-[0_14px_36px_rgba(23,37,53,0.1)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0"><CategoryLabel category={category} /><Link href={`/issues/${id}`} className="civic-focus mt-3 block rounded-md"><h3 className="line-clamp-2 font-headline-md text-headline-md font-bold tracking-[-0.04em] text-primary group-hover:text-[#9a6119]">{title}</h3></Link></div>
        {imageUrl && <img src={imageUrl} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" />}
      </div>
      <p className="mt-3 line-clamp-2 text-sm leading-6 text-on-surface-variant">{description}</p>
      {reactionError && <p role="alert" className="mt-3 text-xs text-[#9a3d38]">{reactionError}</p>}
      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-[#e4e1d9] pt-4">
        <div className="flex items-center gap-3 text-xs text-on-surface-variant"><span className="inline-flex items-center gap-1"><MapPin size={14} />{zone}</span><StatusBadge status={initialStatus} /></div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => void handleAffectedToggle()} aria-pressed={hasAffected} className={`civic-focus inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-extrabold transition-colors ${hasAffected ? "border-[#efc98d] bg-[#fff3df] text-[#8c5a13]" : "border-[#d8d6cf] bg-white text-on-surface-variant hover:border-[#efc98d] hover:text-[#8c5a13]"}`}><ThumbsUp size={14} />{affectedCount}</button>
          <span className="inline-flex items-center gap-1 text-xs font-bold text-[#39704a]"><BadgeCheck size={15} />{confirmedCount}</span>
          <Link href={`/issues/${id}`} className="civic-focus inline-flex rounded-lg p-2 text-primary hover:bg-[#eee8dc]" aria-label={`Open ${title}`}><ArrowUpRight size={17} /></Link>
        </div>
      </div>
    </article>
  );
}
