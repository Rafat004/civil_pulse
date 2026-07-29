import React from 'react';
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
  
  return (
    <div className={`bg-surface border border-[#334155] rounded-2xl p-lg flex flex-col md:flex-row gap-lg card-shadow transition-all duration-300 card-shadow-hover group ${isResolved ? 'opacity-75 hover:opacity-100' : ''}`}>
      {/* Info Column */}
      <div className="flex-grow flex flex-col gap-sm">
        <div className="flex justify-between items-start">
          <div className="flex flex-col">
            <span className={`font-label-md text-label-md mb-1 ${isResolved ? 'text-secondary' : isReported ? 'text-tertiary' : 'text-primary'}`}>{id}</span>
            <h3 className={`font-headline-md text-headline-md text-on-surface ${isResolved ? 'line-through decoration-[#334155]' : ''}`}>{title}</h3>
          </div>
          <StatusBadge status={status} />
        </div>
        <p className="font-body-md text-body-md text-on-surface-variant line-clamp-2">{description}</p>
        
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
            <button className="bg-surface border border-outline hover:border-primary text-on-surface hover:text-primary font-label-md text-label-md px-4 py-2 rounded-lg transition-colors flex items-center gap-1">
              <span className="material-symbols-outlined text-[18px]">edit</span>
              Edit
            </button>
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
