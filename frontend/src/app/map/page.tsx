"use client";

import { useState, useEffect, useMemo } from 'react';
import dynamicImport from 'next/dynamic';
import { supabase } from '@/lib/supabaseClient';
import { REPORT_CATEGORIES, REPORT_STATUSES } from '@/lib/constants';
import { getStatusColor, getCategoryIconSymbol } from '@/lib/mapUtils';
import type { MapMarkerItem } from '@/components/MapComponent';

const MapComponent = dynamicImport(() => import('@/components/MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-surface-container-highest flex items-center justify-center">
      <span className="text-on-surface-variant font-label-md">Loading Map & Discovery...</span>
    </div>
  )
});

interface RawReport {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  zone?: string;
  lat: number;
  lng: number;
  image_url?: string;
  created_at: string;
  department_id?: string;
  department?: { name: string } | null;
}

export default function MapView() {
  const [allReports, setAllReports] = useState<RawReport[]>([]);
  const [affectedCounts, setAffectedCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showLegend, setShowLegend] = useState<boolean>(false);
  const [showControlsMobile, setShowControlsMobile] = useState<boolean>(true);

  // User Geolocation
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  // 1. Fetch initial reports & reaction counts
  useEffect(() => {
    const fetchMapData = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: reportsData, error: reportsErr } = await supabase
          .from('reports')
          .select(`
            id,
            title,
            description,
            category,
            status,
            zone,
            lat,
            lng,
            image_url,
            created_at,
            department_id,
            department:departments(name)
          `);

        if (reportsErr) throw reportsErr;

        const reports = (reportsData || []) as unknown as RawReport[];
        setAllReports(reports);

        // Fetch affected counts for map markers
        const reportIds = reports.map((r) => r.id);
        if (reportIds.length > 0) {
          const { data: reactionsData, error: rxErr } = await supabase
            .from('report_reactions')
            .select('report_id')
            .eq('type', 'affected')
            .in('report_id', reportIds);

          if (!rxErr && reactionsData) {
            const counts: Record<string, number> = {};
            reactionsData.forEach((rx) => {
              counts[rx.report_id] = (counts[rx.report_id] || 0) + 1;
            });
            setAffectedCounts(counts);
          }
        }
      } catch (err: any) {
        console.error('Failed to load map data:', err);
        setError(err.message || 'Failed to load map reports.');
      } finally {
        setLoading(false);
      }
    };

    fetchMapData();

    // 2. Realtime listener for INSERT, UPDATE, DELETE on reports
    const channel = supabase
      .channel('map-discovery-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reports' }, async (payload) => {
        const newReport = payload.new as RawReport;
        setAllReports((prev) => {
          if (prev.some((r) => r.id === newReport.id)) return prev;
          return [newReport, ...prev];
        });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'reports' }, (payload) => {
        const updated = payload.new as RawReport;
        setAllReports((prev) =>
          prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r))
        );
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'reports' }, (payload) => {
        const deletedId = payload.old.id;
        setAllReports((prev) => prev.filter((r) => r.id !== deletedId));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // 3. Filter reports client-side
  const filteredReports = useMemo(() => {
    return allReports.filter((r) => {
      const matchesCategory = categoryFilter === 'All' || r.category === categoryFilter;
      const matchesStatus = statusFilter === 'All' || r.status === statusFilter;
      const matchesSearch =
        !searchQuery.trim() ||
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.zone && r.zone.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (r.description && r.description.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesCategory && matchesStatus && matchesSearch;
    });
  }, [allReports, categoryFilter, statusFilter, searchQuery]);

  // Convert filtered reports into MapMarkerItems
  const mapMarkers: MapMarkerItem[] = useMemo(() => {
    return filteredReports.map((r) => ({
      id: r.id,
      lat: r.lat,
      lng: r.lng,
      title: r.title,
      status: r.status,
      category: r.category,
      zone: r.zone,
      department_name: r.department?.name,
      affected_count: affectedCounts[r.id] || 0,
      created_at: r.created_at,
      image_url: r.image_url,
    }));
  }, [filteredReports, affectedCounts]);

  const resetFilters = () => {
    setCategoryFilter('All');
    setStatusFilter('All');
    setSearchQuery('');
  };

  const hasActiveFilters = categoryFilter !== 'All' || statusFilter !== 'All' || searchQuery.trim() !== '';

  return (
    <main className="flex-1 relative flex flex-col md:flex-row overflow-hidden h-[calc(100vh-64px)] w-full bg-surface">
      {/* Sidebar / Floating Control Panel */}
      <div className="absolute top-3 left-3 z-[1001] w-full max-w-[calc(100vw-24px)] md:max-w-[340px] pointer-events-auto">
        <div className="bg-surface-container/95 backdrop-blur-md border border-outline-variant/60 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
          {/* Header Bar */}
          <div className="p-3 border-b border-outline-variant/40 flex items-center justify-between bg-surface-container-high/50">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">explore</span>
              <h1 className="font-title-md font-bold text-on-surface text-sm">Map & Discovery</h1>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowLegend(!showLegend)}
                className={`p-1.5 rounded-lg text-xs font-label-md flex items-center gap-1 transition-colors ${
                  showLegend ? 'bg-primary/10 text-primary' : 'text-on-surface-variant hover:bg-surface-variant'
                }`}
                title="Toggle Map Legend"
              >
                <span className="material-symbols-outlined text-[16px]">legend_toggle</span>
                <span className="hidden sm:inline">Legend</span>
              </button>

              <button
                type="button"
                onClick={() => setShowControlsMobile(!showControlsMobile)}
                className="md:hidden p-1.5 text-on-surface-variant hover:bg-surface-variant rounded-lg transition-colors"
                title="Toggle Filter Controls"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {showControlsMobile ? 'expand_less' : 'tune'}
                </span>
              </button>
            </div>
          </div>

          {/* Collapsible Content Area */}
          <div className={`${showControlsMobile ? 'block' : 'hidden md:block'} p-3 space-y-3 overflow-y-auto`}>
            {/* Search Input */}
            <div className="relative">
              <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by title, zone..."
                className="w-full bg-surface pl-8 pr-3 py-1.5 rounded-lg border border-outline-variant text-on-surface text-xs focus:outline-none focus:border-primary transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
                >
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              )}
            </div>

            {/* Category Filter */}
            <div className="space-y-1">
              <label className="text-[11px] font-label-md text-on-surface-variant uppercase tracking-wider block font-semibold">
                Category
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full bg-surface p-2 rounded-lg border border-outline-variant text-on-surface text-xs focus:outline-none focus:border-primary transition-colors cursor-pointer"
              >
                <option value="All">All Categories</option>
                {REPORT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="space-y-1">
              <label className="text-[11px] font-label-md text-on-surface-variant uppercase tracking-wider block font-semibold">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-surface p-2 rounded-lg border border-outline-variant text-on-surface text-xs focus:outline-none focus:border-primary transition-colors cursor-pointer"
              >
                <option value="All">All Statuses</option>
                {REPORT_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            {/* Active Count & Reset Action */}
            <div className="flex items-center justify-between pt-1 border-t border-outline-variant/30">
              <span className="text-xs font-medium text-on-surface-variant">
                Showing <strong className="text-primary">{filteredReports.length}</strong> of {allReports.length} issues
              </span>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="text-xs font-semibold text-primary hover:underline flex items-center gap-0.5"
                >
                  <span className="material-symbols-outlined text-[14px]">restart_alt</span>
                  Reset
                </button>
              )}
            </div>

            {/* Map Legend (Collapsible) */}
            {showLegend && (
              <div className="mt-2 pt-2 border-t border-outline-variant/40 space-y-2 text-xs bg-surface/50 p-2.5 rounded-xl">
                <div>
                  <span className="font-bold text-on-surface block mb-1 text-[11px] uppercase tracking-wider">
                    Status Ring Color
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {REPORT_STATUSES.map((st) => (
                      <div key={st} className="flex items-center gap-1.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0"
                          style={{ backgroundColor: getStatusColor(st) }}
                        />
                        <span className="text-[10px] text-on-surface-variant font-medium">{st}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-1.5 border-t border-outline-variant/20">
                  <span className="font-bold text-on-surface block mb-1 text-[11px] uppercase tracking-wider">
                    Category Icon
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {REPORT_CATEGORIES.map((cat) => (
                      <div key={cat} className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px] text-primary">
                          {getCategoryIconSymbol(cat)}
                        </span>
                        <span className="text-[10px] text-on-surface-variant font-medium truncate">{cat}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Map Surface */}
      <div className="absolute inset-0 z-0">
        <MapComponent
          mapId="public-map-discovery"
          markers={mapMarkers}
          interactive={true}
          showSearch={true}
          showUserLocationButton={true}
          userLocation={userLocation}
          onUserLocationFound={(lat, lng) => setUserLocation({ lat, lng })}
          onUserLocationError={(msg) => setLocationError(msg)}
        />
      </div>

      {/* Geolocation feedback notification */}
      {locationError && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] bg-error text-on-error text-xs px-4 py-2 rounded-full shadow-lg border border-error/30 flex items-center gap-2 animate-bounce">
          <span className="material-symbols-outlined text-[16px]">warning</span>
          <span>{locationError}</span>
          <button onClick={() => setLocationError(null)} className="ml-1 hover:opacity-80">
            <span className="material-symbols-outlined text-[14px]">close</span>
          </button>
        </div>
      )}
    </main>
  );
}
