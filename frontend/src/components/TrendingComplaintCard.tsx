"use client";
import React, { useState } from 'react';
import StatusBadge, { StatusType } from './StatusBadge';

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

import { useAuth } from './AuthProvider';
import { supabase } from '@/lib/supabaseClient';

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
  const { role, user } = useAuth();
  const [upvoted, setUpvoted] = useState(hasUpvoted);
  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [status, setStatus] = useState(initialStatus);

  const handleUpvote = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      alert("You must be logged in to upvote.");
      return;
    }
    
    // Optimistic UI
    if (upvoted) {
      setUpvotes(prev => prev - 1);
      setUpvoted(false);
    } else {
      setUpvotes(prev => prev + 1);
      setUpvoted(true);
    }
    
    // In a real app we'd trigger a Supabase RPC or insert into the upvotes table here
  };

  const handleStatusChange = async (newStatus: StatusType) => {
    setStatus(newStatus);
    const { error } = await supabase.from('reports').update({ status: newStatus }).eq('id', id);
    if (error) {
      alert("Failed to update status: " + error.message);
    }
  };

  return (
    <div className="bg-surface rounded-2xl border border-[#334155] p-md complaint-card flex gap-md cursor-pointer relative">
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
            <h3 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface leading-tight">{title}</h3>
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
            {role === 'admin' ? (
              <select 
                value={status} 
                onChange={(e) => handleStatusChange(e.target.value as StatusType)}
                onClick={(e) => e.stopPropagation()}
                className="bg-surface p-1 rounded border border-outline-variant text-on-surface text-xs focus:outline-none"
              >
                <option value="Reported">Reported</option>
                <option value="Verified">Verified</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
              </select>
            ) : null}
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
