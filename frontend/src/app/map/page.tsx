"use client";

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabaseClient';

const MapComponent = dynamic(() => import('@/components/MapComponent'), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-surface-container-highest flex items-center justify-center">
      <span className="text-on-surface-variant">Loading Map...</span>
    </div>
  )
});

interface Report {
  id: string;
  title: string;
  status: string;
  lat: number;
  lng: number;
}

export default function MapView() {
  const [markers, setMarkers] = useState<Report[]>([]);

  useEffect(() => {
    const fetchReports = async () => {
      const { data, error } = await supabase
        .from('reports')
        .select('id, title, status, lat, lng');

      if (!error && data) {
        setMarkers(data);
      }
    };

    fetchReports();

    // Listen for new reports in realtime
    const channel = supabase
      .channel('map-reports')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reports' }, (payload) => {
        const r = payload.new as Report;
        setMarkers(prev => [...prev, r]);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'reports' }, (payload) => {
        setMarkers(prev => prev.map(m => m.id === payload.new.id ? { ...m, ...payload.new } : m));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <main className="flex-1 relative flex overflow-hidden h-[calc(100vh-64px)]">
      <div className="absolute inset-0 z-0">
        <MapComponent markers={markers} interactive={true} showSearch={true} />
      </div>
    </main>
  );
}

