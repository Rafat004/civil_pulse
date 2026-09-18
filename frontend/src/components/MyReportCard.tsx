"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Circle, Edit3, Eye, LoaderCircle } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import StatusBadge, { StatusType } from "./StatusBadge";

interface MyReportCardProps { id: string; title: string; description: string; status: StatusType; date: string; }

const steps: StatusType[] = ["Reported", "Verified", "In Progress", "Resolved"];

export default function MyReportCard({ id, title, description, status, date }: MyReportCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [currentTitle, setCurrentTitle] = useState(title);
  const [currentDesc, setCurrentDesc] = useState(description);
  const [editTitle, setEditTitle] = useState(title);
  const [editDesc, setEditDesc] = useState(description);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const isReported = status === "Reported";
  const currentStep = steps.indexOf(status === "Assigned" ? "Verified" : status);

  const handleSave = async () => {
    if (!isReported) { setIsEditing(false); return; }
    setSaving(true); setSaveError(null);
    const { error } = await supabase.from("reports").update({ title: editTitle.trim(), description: editDesc.trim() }).eq("id", id);
    if (error) setSaveError(error.message || "Failed to update the report.");
    else { setCurrentTitle(editTitle.trim()); setCurrentDesc(editDesc.trim()); setIsEditing(false); }
    setSaving(false);
  };

  return (
    <article className={`civic-surface flex flex-col gap-6 p-5 transition-shadow hover:shadow-[0_14px_36px_rgba(23,37,53,0.1)] md:flex-row md:gap-8 ${status === "Resolved" ? "bg-[#fbfaf7]" : ""}`}>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-4"><div className="min-w-0 flex-1"><p className="font-label-mono text-[10px] uppercase tracking-[0.1em] text-on-surface-variant">Report {id.slice(0, 8)}</p>{isEditing && isReported ? <input aria-label="Report title" value={editTitle} onChange={(event) => setEditTitle(event.target.value)} className="civic-focus mt-2 w-full rounded-lg border border-[#d8d6cf] bg-white px-3 py-2 font-headline-md text-headline-md font-bold text-primary" /> : <Link href={`/issues/${id}`} className="civic-focus mt-2 block rounded-md"><h3 className="font-headline-md text-headline-md font-bold tracking-[-0.04em] text-primary hover:text-[#9a6119]">{currentTitle}</h3></Link>}</div><StatusBadge status={status} /></div>
        {isEditing && isReported ? <textarea aria-label="Report description" value={editDesc} onChange={(event) => setEditDesc(event.target.value)} className="civic-focus mt-4 h-24 w-full resize-none rounded-lg border border-[#d8d6cf] bg-white px-3 py-2 text-sm leading-6 text-on-surface" /> : <p className="mt-3 line-clamp-2 text-sm leading-6 text-on-surface-variant">{currentDesc}</p>}
        {saveError && <p role="alert" className="mt-3 text-xs text-[#9a3d38]">{saveError}</p>}
        <div className="mt-6 grid grid-cols-4 gap-1 md:max-w-[520px]">{steps.map((step, index) => { const complete = currentStep >= index; const active = step === status || (status === "Assigned" && step === "Verified"); return <div key={step} className="relative text-center"><div className="absolute left-1/2 top-3 h-px w-full -translate-y-1/2 bg-[#d8d6cf] last:hidden" /><div className={`relative z-10 mx-auto grid h-6 w-6 place-items-center rounded-full border-2 border-[#fffefa] ${complete ? "bg-[#39704a] text-white" : active ? "bg-[#b87924] text-white" : "bg-[#c9cbd0] text-white"}`}>{complete ? <Check size={12} /> : <Circle size={8} fill="currentColor" />}</div><span className={`mt-2 block text-[10px] font-bold ${active ? "text-primary" : "text-on-surface-variant"}`}>{step}</span></div>; })}</div>
      </div>
      <div className="flex shrink-0 flex-row items-center justify-between gap-3 border-t border-[#e4e1d9] pt-4 md:w-36 md:flex-col md:items-end md:justify-start md:border-l md:border-t-0 md:pl-5 md:pt-0"><time className="text-xs text-on-surface-variant">Updated {date}</time><div className="flex items-center gap-1.5">{isReported && isEditing && <><button type="button" onClick={() => { setIsEditing(false); setSaveError(null); }} disabled={saving} className="civic-focus rounded-lg border border-[#d8d6cf] bg-white px-2.5 py-2 text-xs font-bold text-on-surface-variant">Cancel</button><button type="button" onClick={() => void handleSave()} disabled={saving} className="civic-focus inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-2 text-xs font-bold text-white">{saving ? <LoaderCircle size={13} className="animate-spin" /> : <Check size={13} />}Save</button></>}{isReported && !isEditing && <button type="button" onClick={() => setIsEditing(true)} className="civic-focus inline-flex items-center gap-1 rounded-lg border border-[#d8d6cf] bg-white px-2.5 py-2 text-xs font-bold text-on-surface-variant hover:border-primary hover:text-primary"><Edit3 size={13} />Edit</button>}<Link href={`/issues/${id}`} className="civic-focus inline-flex items-center gap-1 rounded-lg px-2 py-2 text-xs font-bold text-on-surface-variant hover:text-primary"><Eye size={14} />View</Link></div></div>
    </article>
  );
}
