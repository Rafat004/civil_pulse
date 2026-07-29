"use client";

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import TrendingComplaintCard from '@/components/TrendingComplaintCard';
import { supabase } from '@/lib/supabaseClient';
import { StatusType } from '@/components/StatusBadge';

// Dynamically import MapComponent to disable SSR since leaflet uses window
const MapComponent = dynamic(() => import('@/components/MapComponent'), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-surface-container-highest flex items-center justify-center rounded-2xl border border-[#334155]">
      <span className="text-on-surface-variant">Loading Map...</span>
    </div>
  )
});

interface Issue {
  id: string;
  category: string;
  title: string;
  description: string;
  zone: string;
  status: StatusType;
  upvotes_count: number;
  image_url?: string;
  lat: number;
  lng: number;
  hasUpvoted?: boolean;
}

export default function Dashboard() {
  const [trendingIssues, setTrendingIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Initial Fetch
    const fetchReports = async () => {
      try {
        const { data, error } = await supabase
          .from('reports')
          .select('*')
          .order('upvotes_count', { ascending: false });

        if (error) {
          console.error("Error fetching reports:", error);
          return;
        }

        // Add hasUpvoted mock logic for UI purposes since Auth isn't fully set
        const formattedData = data.map(report => ({
          ...report,
          hasUpvoted: false
        }));

        setTrendingIssues(formattedData);
      } catch (err) {
        console.error("Unexpected error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();

    // 2. Realtime Subscription
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'reports' },
        (payload) => {
          console.log('Realtime Update Received:', payload);
          setTrendingIssues((prev) => 
            prev.map((issue) => 
              issue.id === payload.new.id 
                ? { ...issue, ...payload.new } 
                : issue
            ).sort((a, b) => b.upvotes_count - a.upvotes_count)
          );
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'reports' },
        (payload) => {
          setTrendingIssues((prev) => {
            const newIssues = [{ ...payload.new, hasUpvoted: false } as Issue, ...prev];
            return newIssues.sort((a, b) => b.upvotes_count - a.upvotes_count);
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Format markers for the map
  const mapMarkers = trendingIssues.map(issue => ({
    id: issue.id,
    lat: issue.lat,
    lng: issue.lng,
    title: issue.title,
    status: issue.status
  }));

  return (
    <main className="flex-grow w-full max-w-[1440px] mx-auto px-margin-mobile md:px-margin-desktop py-lg flex flex-col gap-xl">
      <section className="flex flex-col items-center justify-center text-center py-3xl px-md bg-gradient-to-br from-surface to-surface-container-low rounded-3xl border border-outline-variant relative overflow-hidden shadow-sm">
        {/* Decorative mesh gradient blurs for premium feel */}
        <div className="absolute top-[-20%] left-[-10%] w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-96 h-96 bg-tertiary/5 rounded-full blur-3xl pointer-events-none"></div>
        
        <h1 className="font-display-lg text-display-lg text-on-surface mb-sm relative z-10 tracking-tight">Empower Your City</h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant mb-lg max-w-[600px] relative z-10">
          Report, Upvote, and Track Local Issues in Real-Time.
        </p>
        <button 
          onClick={() => window.dispatchEvent(new Event('open-new-report'))}
          className="bg-primary text-on-primary px-xl py-md rounded-full font-label-md text-label-md hover:bg-primary-fixed-dim transition-colors shadow-lg shadow-primary/20 flex items-center gap-sm relative z-10"
        >
          <span className="material-symbols-outlined">add_circle</span>
          Report an Issue
        </button>
      </section>

      {/* Dashboard Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-gutter min-h-[800px]">
        
        {/* Left: Map Area (60%) */}
        <div className="lg:col-span-8 flex flex-col gap-xl">
          <div className="flex-grow relative z-0 min-h-[400px] bg-surface-container-low rounded-2xl border border-surface-variant overflow-hidden shadow-sm">

            
            {/* Map Container */}
            <div className="w-full h-full">
              <MapComponent 
                mapId="dashboard-map"
                interactive={false}
                markers={mapMarkers}
                showSearch={true}
              />
            </div>
          </div>
        </div>

        {/* Right: Complaint Feed (40%) */}
        <div className="lg:col-span-4 h-full flex flex-col bg-surface-container-low rounded-2xl border border-surface-variant overflow-hidden">
          <div className="p-md border-b border-outline-variant bg-surface sticky top-0 z-10 flex justify-between items-center">
            <h2 className="font-headline-md text-headline-md text-on-surface">Trending Issues</h2>

          </div>
          <div className="flex-grow overflow-y-auto p-md flex flex-col gap-md custom-scrollbar">
            {trendingIssues.map((issue) => (
              <TrendingComplaintCard
                key={issue.id}
                id={issue.id}
                category={issue.category}
                title={issue.title}
                description={issue.description}
                zone={issue.zone}
                status={issue.status}
                upvotes={issue.upvotes_count}
                imageUrl={issue.image_url}
                hasUpvoted={issue.hasUpvoted}
              />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
