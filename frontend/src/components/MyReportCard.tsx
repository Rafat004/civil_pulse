import React, { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import StatusBadge, { StatusType } from './StatusBadge';

interface MyReportCardProps {
  id: string;
  title: string;
  description: string;
  status: StatusType;
  date: string;
}

export default function MyReportCard({
  id,
  title,
  description,
  status,
  date
}: MyReportCardProps) {
  const isResolved = status === 'Resolved';
  const isReported = status === 'Reported';
  
  const [isEditing, setIsEditing] = useState(false);
  const [currentTitle, setCurrentTitle] = useState(title);
  const [currentDesc, setCurrentDesc] = useState(description);
  
  const [editTitle, setEditTitle] = useState(title);
  const [editDesc, setEditDesc] = useState(description);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('reports')
      .update({ title: editTitle, description: editDesc })
      .eq('id', id);
    
    if (!error) {
      setCurrentTitle(editTitle);
      setCurrentDesc(editDesc);
      setIsEditing(false);
    } else {
      console.error("Failed to update report:", error);
    }
    setSaving(false);
  };
  
  return (
    <div className={`glass-card backdrop-blur-lg bg-white/5 dark:bg-black/10 border border-white/20 dark:border-white/10 rounded-2xl p-lg flex flex-col md:flex-row gap-lg shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 hover:bg-white/10 group ${isResolved ? 'opacity-75 hover:opacity-100' : ''}`}>
      {/* Info Column */}
      <div className="flex-grow flex flex-col gap-sm">
        <div className="flex justify-between items-start gap-4">
          <div className="flex flex-col flex-grow">
            <span className={`font-label-md text-label-md mb-1 ${isResolved ? 'text-secondary' : isReported ? 'text-tertiary' : 'text-primary'}`}>{id}</span>
            {isEditing ? (
              <input 
                type="text" 
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="font-headline-md text-headline-md text-on-surface bg-surface-variant/50 border border-outline-variant rounded-md px-2 py-1 outline-none focus:border-primary w-full"
              />
            ) : (
              <h3 className={`font-headline-md text-headline-md text-on-surface ${isResolved ? 'line-through decoration-[#334155]' : ''}`}>{isEditing ? editTitle : currentTitle}</h3>
            )}
          </div>
          <StatusBadge status={status} />
        </div>
        {isEditing ? (
          <textarea 
            value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
            className="font-body-md text-body-md text-on-surface bg-surface-variant/50 border border-outline-variant rounded-md px-2 py-1 outline-none focus:border-primary w-full h-24 resize-none"
          />
        ) : (
          <p className="font-body-md text-body-md text-on-surface-variant line-clamp-2">{isEditing ? editDesc : currentDesc}</p>
        )}
        
        {/* Timeline Component Mock */}
        <div className={`mt-md relative flex items-center justify-between w-full md:w-3/4 before:absolute before:inset-0 before:ml-[14px] before:mr-[14px] before:-translate-y-1/2 before:h-0.5 before:top-1/2 before:z-0 ${isResolved ? 'before:bg-secondary' : 'before:bg-[#334155]'}`}>
          {/* Step 1: Reported */}
          <div className="flex flex-col items-center gap-1 relative z-10">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center ${isResolved || status === 'In Progress' || status === 'Verified' ? 'bg-secondary text-surface' : 'bg-surface border-2 border-tertiary text-tertiary'}`}>
              {status === 'Reported' ? <div className="w-2 h-2 rounded-full bg-tertiary"></div> : <span className="material-symbols-outlined text-[16px] icon-fill">check</span>}
            </div>
            <span className={`font-caption text-caption text-[10px] ${status === 'Reported' ? 'text-tertiary font-medium' : 'text-on-surface-variant'}`}>Reported</span>
          </div>
          
          {/* Step 2: Verified */}
          <div className="flex flex-col items-center gap-1 relative z-10">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center ${isResolved || status === 'In Progress' ? 'bg-secondary text-surface' : 'bg-surface border-2 border-[#334155]'}`}>
              {(isResolved || status === 'In Progress') && <span className="material-symbols-outlined text-[16px] icon-fill">check</span>}
            </div>
            <span className={`font-caption text-caption text-[10px] ${status === 'Verified' ? 'text-primary font-medium' : 'text-on-surface-variant'}`}>Verified</span>
          </div>
          
          {/* Step 3: In Progress */}
          <div className="flex flex-col items-center gap-1 relative z-10">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center ${isResolved ? 'bg-secondary text-surface' : status === 'In Progress' ? 'bg-surface border-2 border-primary text-primary' : 'bg-surface border-2 border-[#334155]'}`}>
              {isResolved && <span className="material-symbols-outlined text-[16px] icon-fill">check</span>}
              {status === 'In Progress' && <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>}
            </div>
            <span className={`font-caption text-caption text-[10px] ${status === 'In Progress' ? 'text-primary font-medium' : 'text-on-surface-variant'}`}>In Progress</span>
          </div>

          {/* Step 4: Resolved */}
          <div className="flex flex-col items-center gap-1 relative z-10">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center ${isResolved ? 'bg-secondary text-surface shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-surface border-2 border-[#334155]'}`}>
              {isResolved && <span className="material-symbols-outlined text-[16px] icon-fill">done_all</span>}
            </div>
            <span className={`font-caption text-caption text-[10px] ${isResolved ? 'text-secondary font-medium' : 'text-on-surface-variant'}`}>Resolved</span>
          </div>
        </div>
      </div>
      
      {/* Action Column */}
      <div className="flex flex-row md:flex-col justify-end md:justify-start items-center md:items-end gap-sm pt-4 md:pt-0 border-t md:border-t-0 md:border-l border-[#1E293B] md:pl-lg">
        <span className="font-caption text-caption text-on-surface-variant flex-grow md:flex-grow-0 mb-auto">{date}</span>
        <div className="flex gap-2">
          {!isResolved ? (
            isEditing ? (
              <div className="flex gap-2">
                <button onClick={() => setIsEditing(false)} className="bg-transparent border border-outline-variant text-on-surface-variant hover:text-on-surface font-label-md text-label-md px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
                  Cancel
                </button>
                <button onClick={handleSave} disabled={saving} className="bg-primary text-on-primary font-label-md text-label-md px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            ) : (
              <button onClick={() => setIsEditing(true)} className="bg-surface border border-outline hover:border-primary text-on-surface hover:text-primary font-label-md text-label-md px-4 py-2 rounded-lg transition-colors flex items-center gap-1">
                <span className="material-symbols-outlined text-[18px]">edit</span>
                Edit
              </button>
            )
          ) : (
            <button className="text-on-surface-variant hover:text-primary font-label-md text-label-md px-2 py-2 transition-colors flex items-center gap-1 text-sm">
              <span className="material-symbols-outlined text-[16px]">visibility</span>
              View Details
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
