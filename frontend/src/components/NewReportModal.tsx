import React, { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from './AuthProvider';
import { intelligenceApiUrl } from '@/lib/config';
import { validateReportImage } from '@/lib/images';
import { REPORT_CATEGORIES } from '@/lib/constants';

const MapComponent = dynamic(() => import('@/components/MapComponent'), { ssr: false });

interface NewReportModalProps {
  onClose: () => void;
}

interface ExistingReportItem {
  id: string;
  title: string;
  category: string;
  status: string;
  lat: number;
  lng: number;
}

function calculateHaversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function NewReportModal({ onClose }: NewReportModalProps) {
  const { user } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>(REPORT_CATEGORIES[0]);
  const [zone, setZone] = useState('General');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Existing reports for nearby discovery
  const [existingReports, setExistingReports] = useState<ExistingReportItem[]>([]);

  useEffect(() => {
    const fetchExistingReports = async () => {
      const { data, error: fetchErr } = await supabase
        .from('reports')
        .select('id, title, category, status, lat, lng');

      if (!fetchErr && data) {
        setExistingReports(data as ExistingReportItem[]);
      }
    };

    fetchExistingReports();
  }, []);

  // Compute nearby issues within 2.0 km when location is selected
  const nearbyIssues = useMemo(() => {
    if (!location || existingReports.length === 0) return [];

    return existingReports
      .map((r) => {
        const distKm = calculateHaversineDistanceKm(location.lat, location.lng, r.lat, r.lng);
        return { ...r, distKm };
      })
      .filter((r) => r.distKm <= 2.0)
      .sort((a, b) => a.distKm - b.distKm)
      .slice(0, 4);
  }, [location, existingReports]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      const validationError = validateReportImage(file);
      if (validationError) {
        setError(validationError);
        setImageFile(null);
        e.target.value = '';
        return;
      }
    }
    setError(null);
    setImageFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError("You must be logged in to submit a report.");
      return;
    }
    if (!location) {
      setError("Please select a location on the map.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      // 1. Check for duplicates using Intelligence API (Advisory check)
      try {
        const dupCheckRes = await fetch(intelligenceApiUrl('/cluster-duplicates'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lat: location.lat, lng: location.lng, title })
        });
        if (dupCheckRes.ok) {
          const dupCheckData = await dupCheckRes.json();
          if (dupCheckData.is_duplicate) {
            if (!confirm(`Warning: ${dupCheckData.message}\n\nDo you still want to submit this?`)) {
              setLoading(false);
              return;
            }
          }
        }
      } catch (dupErr) {
        console.warn('Duplicate detection service unavailable, continuing with submission:', dupErr);
      }

      // 2. Validate & Upload Image (if provided)
      let image_url = null;
      if (imageFile) {
        const validationError = validateReportImage(imageFile);
        if (validationError) {
          setError(validationError);
          setLoading(false);
          return;
        }

        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('reports')
          .upload(fileName, imageFile);

        if (uploadError) {
          throw new Error(`Image upload failed: ${uploadError.message}`);
        }

        const { data: publicUrlData } = supabase.storage.from('reports').getPublicUrl(fileName);
        image_url = publicUrlData.publicUrl;
      }

      // 3. Insert into Supabase (enforcing user_id = auth.uid())
      const { error: dbError } = await supabase.from('reports').insert([{
        title,
        description,
        category,
        zone,
        lat: location.lat,
        lng: location.lng,
        user_id: user.id,
        image_url,
        status: 'Reported',
      }]);

      if (dbError) throw dbError;

      onClose(); // Successfully submitted
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during submission.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4">
      <div className="bg-surface-container rounded-2xl w-[90%] max-w-[800px] max-h-[90vh] overflow-y-auto border border-outline-variant shadow-2xl flex flex-col">
        <div className="p-md border-b border-outline-variant flex justify-between items-center sticky top-0 bg-surface-container z-10">
          <h2 className="text-headline-md font-headline-md text-on-surface">Report a Civic Issue</h2>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-md flex flex-col gap-lg">
          {error && (
            <div className="bg-error/10 text-error p-sm rounded-lg border border-error/20 font-body-md text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
            <div className="flex flex-col gap-sm">
              <label className="text-label-md font-label-md text-on-surface-variant">Title</label>
              <input
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="bg-surface p-sm rounded-lg border border-outline-variant text-on-surface focus:outline-none focus:border-primary transition-colors"
                placeholder="E.g., Deep Pothole on 5th Ave"
              />
            </div>

            <div className="flex flex-col gap-sm">
              <label className="text-label-md font-label-md text-on-surface-variant">Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="bg-surface p-sm rounded-lg border border-outline-variant text-on-surface focus:outline-none focus:border-primary transition-colors"
              >
                {REPORT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-sm">
            <label className="text-label-md font-label-md text-on-surface-variant">Description</label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="bg-surface p-sm rounded-lg border border-outline-variant text-on-surface focus:outline-none focus:border-primary transition-colors resize-none"
              placeholder="Provide details about the issue..."
            />
          </div>

          <div className="flex flex-col gap-sm">
            <div className="flex items-center justify-between">
              <label className="text-label-md font-label-md text-on-surface-variant">
                Location (Click map to drop pin)
              </label>
              {location && (
                <span className="text-xs font-semibold text-primary">
                  Pin: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                </span>
              )}
            </div>

            <div className="h-[250px] rounded-lg overflow-hidden border border-outline-variant relative z-0">
              <MapComponent
                mapId="modal-map"
                interactive={true}
                onMapClick={(lat, lng) => setLocation({ lat, lng })}
                selectedLocation={location}
                showSearch={true}
                showUserLocationButton={true}
                onUserLocationFound={(lat, lng) => setLocation({ lat, lng })}
              />
            </div>
          </div>

          {/* Nearby Issues Section (Feature 8) */}
          {location && nearbyIssues.length > 0 && (
            <div className="bg-surface-container-highest/60 p-3 rounded-xl border border-outline-variant space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-on-surface">
                <span className="material-symbols-outlined text-[16px] text-primary">near_me</span>
                <span>Nearby Reported Issues (Within 2 km)</span>
              </div>
              <p className="text-[11px] text-on-surface-variant">
                Check if your issue has already been reported nearby before submitting:
              </p>
              <div className="space-y-1.5">
                {nearbyIssues.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between bg-surface p-2 rounded-lg border border-outline-variant/60 text-xs"
                  >
                    <div className="flex flex-col max-w-[70%]">
                      <span className="font-semibold text-on-surface truncate">{item.title}</span>
                      <span className="text-[10px] text-on-surface-variant">
                        {item.category} • <strong className="text-primary">{item.status}</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-outline">
                        {item.distKm < 1 ? `${Math.round(item.distKm * 1000)} m` : `${item.distKm.toFixed(1)} km`} away
                      </span>
                      <Link
                        href={`/issues/${item.id}`}
                        target="_blank"
                        className="text-[11px] font-semibold text-primary hover:underline"
                      >
                        View
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-sm">
            <label className="text-label-md font-label-md text-on-surface-variant">Photo Evidence (Optional, max 5 MB)</label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageChange}
              className="text-sm text-on-surface-variant file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 transition-colors cursor-pointer"
            />
          </div>

          <div className="flex justify-end gap-sm pt-sm border-t border-outline-variant mt-sm">
            <button
              type="button"
              onClick={onClose}
              className="px-md py-sm rounded-lg font-label-md text-label-md text-on-surface-variant hover:bg-surface-variant transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-primary text-on-primary px-lg py-sm rounded-lg font-label-md text-label-md hover:bg-primary/90 transition-colors shadow-md disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[16px]">sync</span>
                  Submitting...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">send</span>
                  Submit Report
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
