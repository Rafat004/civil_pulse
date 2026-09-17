"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import StatusBadge, { StatusType } from './StatusBadge';
import { useAuth } from './AuthProvider';
import { supabase } from '@/lib/supabaseClient';
import { getReactionSummary, setReaction } from '@/services/reactions';

interface TrendingComplaintCardProps {
  id: string;
  category: string;
  title: string;
  description: string;
  zone: string;
  status: StatusType;
  upvotes: number;
  imageUrl?: string;
  hasUpvoted?: boolean;
}

export default function TrendingComplaintCard({
  id,
  category,
  title,
  description,
  zone,
  status: initialStatus,
  upvotes: initialUpvotes,
  imageUrl,
  hasUpvoted = false,
}: TrendingComplaintCardProps) {
  const router = useRouter();
  const { role, user } = useAuth();
  const [upvoted, setUpvoted] = useState(hasUpvoted);
  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [status, setStatus] = useState(initialStatus);

  useEffect(() => {
    let isMounted = true;
    getReactionSummary(id, user?.id)
      .then((summary) => {
        if (!isMounted) return;
        const total = summary.affected + summary.confirmed;
        if (total > 0 || summary.currentUser.affected || summary.currentUser.confirmed) {
          setUpvotes(total);
          setUpvoted(summary.currentUser.affected || summary.currentUser.confirmed);
        }
      })
      .catch((err) => {
        // Silently swallow if table not created yet or empty
      });
    return () => {
      isMounted = false;
    };
  }, [id, user?.id]);

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button, select, a, input')) return;
    router.push(`/issues/${id}`);
  };

  const handleUpvote = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      alert("You must be logged in to react.");
      return;
    }
    
    const newActive = !upvoted;
    setUpvoted(newActive);
    setUpvotes(prev => newActive ? prev + 1 : Math.max(0, prev - 1));
    
    try {
      await setReaction(id, user.id, 'affected', newActive);
    } catch (err) {
      console.error("Failed to update reaction:", err);
      // Revert optimistic update
      setUpvoted(!newActive);
      setUpvotes(prev => newActive ? Math.max(0, prev - 1) : prev + 1);
    }
  };

  return (
    <div 
      onClick={handleCardClick}
      className="bg-surface rounded-2xl border border-[#334155] p-md complaint-card flex gap-md cursor-pointer relative hover:border-primary/50 transition-colors"
    >
      {/* Upvote Column */}
      <div className="flex flex-col items-center gap-xs pt-xs">
        <button 
          className={`upvote-btn transition-colors ${upvoted ? 'text-secondary-fixed' : 'text-on-surface-variant hover:text-secondary-fixed'}`}
          onClick={handleUpvote}
        >
          <span className="material-symbols-outlined filled text-xl">keyboard_arrow_up</span>
        </button>
        <span className={`font-label-md text-label-md font-bold ${upvoted ? 'text-secondary-fixed' : 'text-primary-fixed-dim'}`}>
          {upvotes}
        </span>
      </div>

      {/* Content */}
      <div className="flex-grow flex flex-col gap-sm">
        <div className="flex justify-between items-start">
          <div>
            <span className="inline-block px-2 py-1 bg-surface-bright text-on-surface-variant font-caption text-caption rounded text-xs mb-1 uppercase tracking-wider border border-outline-variant">
              {category}
            </span>
            <Link href={`/issues/${id}`} className="hover:text-primary transition-colors">
              <h3 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface leading-tight">{title}</h3>
            </Link>
          </div>
        </div>
        <p className="font-body-md text-body-md text-on-surface-variant line-clamp-2 text-sm">
          {description}
        </p>

        {/* Footer */}
        <div className="mt-auto pt-sm border-t border-[#1E293B] flex justify-between items-center text-xs">
          <div className="flex items-center gap-1 text-on-surface-variant">
            <span className="material-symbols-outlined text-[16px]">map</span>
            <span>{zone}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <StatusBadge status={status} />
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


