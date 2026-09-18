"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import StatusBadge, { StatusType } from "./StatusBadge";
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

export default function TrendingComplaintCard({
  id,
  category,
  title,
  description,
  zone,
  status: initialStatus,
  affectedCount: initialAffectedCount = 0,
  confirmedCount: initialConfirmedCount = 0,
  imageUrl,
}: TrendingComplaintCardProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [affectedCount, setAffectedCount] = useState(initialAffectedCount);
  const [confirmedCount, setConfirmedCount] = useState(initialConfirmedCount);
  const [hasAffected, setHasAffected] = useState(false);
  const [reactionError, setReactionError] = useState<string | null>(null);

  useEffect(() => {
    queueMicrotask(() => setAffectedCount(initialAffectedCount));
  }, [initialAffectedCount]);

  useEffect(() => {
    queueMicrotask(() => setConfirmedCount(initialConfirmedCount));
  }, [initialConfirmedCount]);

  useEffect(() => {
    let isMounted = true;
    getReactionSummary(id, user?.id)
      .then((summary) => {
        if (!isMounted) return;
        setAffectedCount(summary.affected);
        setConfirmedCount(summary.confirmed);
        setHasAffected(summary.currentUser.affected);
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [id, user?.id]);

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button, select, a, input")) return;
    router.push(`/issues/${id}`);
  };

  const handleAffectedToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      setReactionError("Log in to mark this report as affected.");
      return;
    }
    setReactionError(null);

    const newActive = !hasAffected;
    setHasAffected(newActive);
    setAffectedCount((prev) => (newActive ? prev + 1 : Math.max(0, prev - 1)));

    try {
      await setReaction(id, user.id, "affected", newActive);
    } catch (err) {
      setReactionError(err instanceof Error ? err.message : "Unable to save your reaction.");
      // Revert optimistic update
      setHasAffected(!newActive);
      setAffectedCount((prev) => (newActive ? Math.max(0, prev - 1) : prev + 1));
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className="bg-surface rounded-2xl border border-[#334155] p-md complaint-card flex gap-md cursor-pointer relative hover:border-primary/50 transition-colors"
    >
      {/* Explicit Reaction Control: I'm Affected */}
      <div className="flex flex-col items-center gap-xs pt-xs">
        <button
          type="button"
          onClick={handleAffectedToggle}
          title="I'm Affected"
          className={`p-2.5 rounded-xl border flex flex-col items-center gap-0.5 transition-all ${
            hasAffected
              ? "bg-amber-500/15 border-amber-500 text-amber-700 dark:text-amber-400 font-semibold"
              : "bg-surface border-outline-variant text-on-surface-variant hover:border-amber-500/50"
          }`}
        >
          <span className="material-symbols-outlined text-lg">warning</span>
          <span className="font-label-md text-[10px] uppercase font-bold">Affected</span>
          <span className="font-label-md text-xs font-bold">{affectedCount}</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-grow flex flex-col gap-sm">
        {reactionError && <p role="alert" className="text-xs text-error">{reactionError}</p>}
        <div className="flex justify-between items-start">
          <div>
            <span className="inline-block px-2 py-1 bg-surface-bright text-on-surface-variant font-caption text-caption rounded text-xs mb-1 uppercase tracking-wider border border-outline-variant">
              {category}
            </span>
            <Link href={`/issues/${id}`} className="hover:text-primary transition-colors">
              <h3 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface leading-tight">
                {title}
              </h3>
            </Link>
          </div>
        </div>
        <p className="font-body-md text-body-md text-on-surface-variant line-clamp-2 text-sm">
          {description}
        </p>

        {/* Footer */}
        <div className="mt-auto pt-sm border-t border-[#1E293B] flex justify-between items-center text-xs">
          <div className="flex items-center gap-3 text-on-surface-variant">
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">map</span>
              <span>{zone}</span>
            </div>
            {confirmedCount > 0 && (
              <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                <span className="material-symbols-outlined text-[15px]">verified</span>
                <span>Confirmed: {confirmedCount}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <StatusBadge status={initialStatus} />
          </div>
        </div>
      </div>

      {/* Thumbnail */}
      {imageUrl && (
        <div className="hidden sm:block w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden border border-outline-variant">
          <img className="w-full h-full object-cover" src={imageUrl} alt={title} />
        </div>
      )}
    </div>
  );
}
