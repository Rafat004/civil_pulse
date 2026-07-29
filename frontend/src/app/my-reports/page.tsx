"use client";

import React, { useEffect, useState } from 'react';
import MyReportCard from '@/components/MyReportCard';
import { StatusType } from '@/components/StatusBadge';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';

interface Report {
  id: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
}

export default function MyReports() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
      return;
    }

    if (user) {
      const fetchReports = async () => {
        try {
          const { data, error } = await supabase
            .from('reports')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

          if (error) {
            console.error("Error fetching reports:", error);
            return;
          }
          setReports(data || []);
        } catch (err) {
          console.error("Failed to fetch reports:", err);
        } finally {
          setLoading(false);
        }
      };
      fetchReports();
    }
  }, [user, authLoading, router]);

  const totalReports = reports.length;
  const resolvedReports = reports.filter(r => r.status === 'Resolved').length;
  const underReviewReports = reports.filter(r => r.status !== 'Resolved').length;

  return (
    <main className="flex-grow w-full max-w-[1440px] mx-auto px-margin-mobile md:px-margin-desktop py-xl md:py-3xl flex flex-col gap-2xl">
      {/* Header & Stats Area */}
      <section className="flex flex-col gap-lg">
        <div>
          <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-background">My Reported Issues</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-xs">Track the progress and status of your civic contributions.</p>
        </div>

        {/* Stats Bento */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
          <div className="bg-surface border border-[#334155] rounded-2xl p-lg flex flex-col gap-xs relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors"></div>
            <span className="font-label-md text-label-md text-on-surface-variant">Total Reports</span>
            <div className="flex items-baseline gap-sm">
              <span className="font-display-lg text-display-lg text-on-surface">{totalReports}</span>
            </div>
          </div>

          <div className="bg-surface border border-[#334155] rounded-2xl p-lg flex flex-col gap-xs relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-secondary/5 rounded-full blur-2xl group-hover:bg-secondary/10 transition-colors"></div>
            <span className="font-label-md text-label-md text-on-surface-variant">Resolved</span>
            <div className="flex items-baseline gap-sm">
              <span className="font-display-lg text-display-lg text-secondary">{resolvedReports}</span>
              <span className="material-symbols-outlined text-secondary text-sm icon-fill">check_circle</span>
            </div>
          </div>

          <div className="bg-surface border border-[#334155] rounded-2xl p-lg flex flex-col gap-xs relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-tertiary/5 rounded-full blur-2xl group-hover:bg-tertiary/10 transition-colors"></div>
            <span className="font-label-md text-label-md text-on-surface-variant">Under Review</span>
            <div className="flex items-baseline gap-sm">
              <span className="font-display-lg text-display-lg text-tertiary">{underReviewReports}</span>
              <span className="material-symbols-outlined text-tertiary text-sm icon-fill">pending</span>
            </div>
          </div>
        </div>
      </section>

      {/* Reports List */}
      <section className="flex flex-col gap-md pb-xl">
        <div className="flex justify-between items-center border-b border-[#1E293B] pb-sm">
          <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Recent Activity</span>
          <button className="flex items-center gap-xs text-on-surface-variant hover:text-primary text-sm transition-colors">
            <span className="material-symbols-outlined">filter_list</span>
            Filter
          </button>
        </div>

        {loading ? (
          <div className="text-on-surface-variant p-4 font-body-md animate-pulse">Loading live reports...</div>
        ) : reports.length === 0 ? (
          <div className="text-on-surface-variant p-4 font-body-md">No reports found. Submit your first issue!</div>
        ) : (
          reports.map((report) => (
            <MyReportCard 
              key={report.id}
              id={report.id}
              title={report.title}
              description={report.description}
              status={report.status as StatusType}
              date={new Date(report.created_at).toLocaleDateString()}
            />
          ))
        )}
      </section>
    </main>
  );
}
