"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import { StatusType } from '@/components/StatusBadge';
import StatusBadge from '@/components/StatusBadge';

interface Issue {
  id: string;
  category: string;
  title: string;
  description: string;
  zone: string;
  status: StatusType;
  upvotes_count: number;
  created_at: string;
}

export default function ApprovalsPage() {
  const { role, loading: authLoading } = useAuth();
  const router = useRouter();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusType | 'All'>('All');

  useEffect(() => {
    if (!authLoading && role !== 'admin') {
      router.push('/');
      return;
    }

    if (role === 'admin') {
      fetchReports();
    }
  }, [role, authLoading, router]);

  const fetchReports = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setIssues(data);
    }
    setLoading(false);
  };

  const handleStatusChange = async (id: string, newStatus: StatusType) => {
    // Optimistic UI update
    setIssues(prev => prev.map(issue => 
      issue.id === id ? { ...issue, status: newStatus } : issue
    ));

    const { error } = await supabase
      .from('reports')
      .update({ status: newStatus })
      .eq('id', id);

    if (error) {
      alert("Failed to update status: " + error.message);
      fetchReports(); // Revert on failure
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this report? This cannot be undone.")) return;
    
    // Optimistic UI update
    setIssues(prev => prev.filter(issue => issue.id !== id));

    const { error } = await supabase
      .from('reports')
      .delete()
      .eq('id', id);

    if (error) {
      alert("Failed to delete report: " + error.message);
      fetchReports(); // Revert on failure
    }
  };

  const filteredIssues = issues.filter(issue => filter === 'All' || issue.status === filter);

  if (authLoading || loading) {
    return (
      <main className="flex-grow w-full max-w-[1440px] mx-auto px-margin-mobile md:px-margin-desktop py-lg flex items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-4xl text-primary">sync</span>
      </main>
    );
  }

  if (role !== 'admin') return null;

  return (
    <main className="flex-grow w-full max-w-[1440px] mx-auto px-margin-mobile md:px-margin-desktop py-lg flex flex-col gap-lg">
      <div className="flex justify-between items-end border-b border-outline-variant pb-md">
        <div>
          <h1 className="text-headline-lg font-headline-lg text-on-surface">Admin Approvals</h1>
          <p className="text-body-md text-on-surface-variant">Review and manage reported civic issues.</p>
        </div>
        
        <div className="flex items-center gap-sm">
          <label className="text-label-md font-label-md text-on-surface-variant">Filter Status:</label>
          <select 
            value={filter}
            onChange={(e) => setFilter(e.target.value as StatusType | 'All')}
            className="bg-surface p-sm rounded-lg border border-outline-variant text-on-surface focus:outline-none focus:border-primary transition-colors text-sm"
          >
            <option value="All">All Statuses</option>
            <option value="Reported">Reported</option>
            <option value="Verified">Verified</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
          </select>
        </div>
      </div>

      <div className="bg-surface-container-low rounded-2xl border border-surface-variant overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface border-b border-surface-variant">
                <th className="p-md font-label-md text-on-surface-variant">Title</th>
                <th className="p-md font-label-md text-on-surface-variant">Category / Zone</th>
                <th className="p-md font-label-md text-on-surface-variant">Upvotes</th>
                <th className="p-md font-label-md text-on-surface-variant">Current Status</th>
                <th className="p-md font-label-md text-on-surface-variant text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredIssues.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-xl text-center text-on-surface-variant">No reports found.</td>
                </tr>
              ) : (
                filteredIssues.map((issue) => (
                  <tr key={issue.id} className="border-b border-surface-variant hover:bg-surface/50 transition-colors">
                    <td className="p-md">
                      <div className="font-label-md text-on-surface">{issue.title}</div>
                      <div className="text-body-sm text-on-surface-variant line-clamp-1 mt-1 max-w-[300px]">{issue.description}</div>
                    </td>
                    <td className="p-md">
                      <div className="text-sm text-on-surface">{issue.category}</div>
                      <div className="text-xs text-on-surface-variant flex items-center gap-1 mt-1">
                        <span className="material-symbols-outlined text-[14px]">map</span>
                        {issue.zone}
                      </div>
                    </td>
                    <td className="p-md">
                      <div className="flex items-center gap-1 text-primary-fixed-dim font-bold">
                        <span className="material-symbols-outlined text-[16px]">keyboard_arrow_up</span>
                        {issue.upvotes_count}
                      </div>
                    </td>
                    <td className="p-md">
                      <StatusBadge status={issue.status} />
                    </td>
                    <td className="p-md text-right">
                      <div className="flex items-center justify-end gap-2">
                        <select 
                          value={issue.status} 
                          onChange={(e) => handleStatusChange(issue.id, e.target.value as StatusType)}
                          className="bg-primary/10 text-primary p-2 rounded-lg border border-primary/20 text-sm font-label-md focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
                        >
                          <option value="Reported">Reported</option>
                          <option value="Verified">Verified</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Resolved">Resolved</option>
                        </select>
                        
                        {/* Only allow deleting Verified or Resolved reports */}
                        {['Verified', 'Resolved'].includes(issue.status) && (
                          <button 
                            onClick={() => handleDelete(issue.id)}
                            className="bg-error/10 text-error p-2 rounded-lg border border-error/20 hover:bg-error hover:text-white transition-colors flex items-center justify-center"
                            title="Delete Report"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
