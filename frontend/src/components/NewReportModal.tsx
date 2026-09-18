import React, { useState, useEffect, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from './AuthProvider';
import { validateReportImage } from '@/lib/images';
import { REPORT_CATEGORIES } from '@/lib/constants';
import SmartSuggestion from './SmartSuggestion';
import { findDuplicates, type DuplicateCandidate } from '@/services/intelligence';

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
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>(REPORT_CATEGORIES[0]);
  const zone = 'General';
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [intelligenceNotice, setIntelligenceNotice] = useState<string | null>(null);
  const [duplicateCandidates, setDuplicateCandidates] = useState<DuplicateCandidate[]>([]);
  const [reviewedDraftKey, setReviewedDraftKey] = useState<string | null>(null);
  const duplicateRequest = useRef<AbortController | null>(null);

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

  const draftKey = useMemo(
    () => JSON.stringify([title.trim(), description.trim(), category, location?.lat ?? null, location?.lng ?? null]),
    [title, description, category, location],
  );

  const resetDuplicateReview = () => {
    duplicateRequest.current?.abort();
    setDuplicateCandidates([]);
    setReviewedDraftKey(null);
    setIntelligenceNotice(null);
  };

  useEffect(() => () => duplicateRequest.current?.abort(), []);

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

  const persistReport = async () => {
    if (!user || !location) return;
    // Validate & upload image only after duplicate review, so a cancelled draft never leaves an orphaned upload.
    let image_url = null;
    if (imageFile) {
      const validationError = validateReportImage(imageFile);
      if (validationError) throw new Error(validationError);

      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('reports').upload(fileName, imageFile);
      if (uploadError) throw new Error(`Image upload failed: ${uploadError.message}`);

      const { data: publicUrlData } = supabase.storage.from('reports').getPublicUrl(fileName);
      image_url = publicUrlData.publicUrl;
    }

    const { error: dbError } = await supabase.from('reports').insert([{
      title: title.trim(),
      description: description.trim(),
      category,
      zone,
      lat: location.lat,
      lng: location.lng,
      user_id: user.id,
      image_url,
      status: 'Reported',
    }]);
    if (dbError) throw dbError;
    onClose();
  };

  const submitAfterReview = async () => {
    setLoading(true);
    setError(null);
    try {
      await persistReport();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during submission.');
    } finally {
      setLoading(false);
    }
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
    setIntelligenceNotice(null);
    try {
      if (reviewedDraftKey !== draftKey) {
        duplicateRequest.current?.abort();
        const controller = new AbortController();
        duplicateRequest.current = controller;
        try {
          const candidates = await findDuplicates({
            title: title.trim(),
            description: description.trim(),
            category,
            lat: location.lat,
            lng: location.lng,
          }, controller.signal);
          if (controller.signal.aborted) return;
          setReviewedDraftKey(draftKey);
          if (candidates.length > 0) {
            setDuplicateCandidates(candidates);
            setLoading(false);
            return;
          }
        } catch (duplicateError) {
          if (controller.signal.aborted) return;
          console.warn('Duplicate detection unavailable; continuing with submission.', duplicateError);
          setIntelligenceNotice('Smart duplicate suggestions are unavailable right now. You can still submit this report.');
          setReviewedDraftKey(draftKey);
        } finally {
          if (duplicateRequest.current === controller) duplicateRequest.current = null;
        }
      }
      await persistReport();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during submission.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4" role="presentation">
      <div role="dialog" aria-modal="true" aria-labelledby="new-report-title" className="bg-surface-container rounded-2xl w-[90%] max-w-[800px] max-h-[90vh] overflow-y-auto border border-outline-variant shadow-2xl flex flex-col">
        <div className="p-md border-b border-outline-variant flex justify-between items-center sticky top-0 bg-surface-container z-10">
          <h2 id="new-report-title" className="text-headline-md font-headline-md text-on-surface">Report a Civic Issue</h2>
          <button type="button" onClick={onClose} aria-label="Close report form" className="text-on-surface-variant hover:text-on-surface transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-md flex flex-col gap-lg">
          {error && (
            <div role="alert" className="bg-error/10 text-error p-sm rounded-lg border border-error/20 font-body-md text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
            <div className="flex flex-col gap-sm">
              <label className="text-label-md font-label-md text-on-surface-variant">Title</label>
              <input
                required
                value={title}
                onChange={e => { resetDuplicateReview(); setTitle(e.target.value); }}
                className="bg-surface p-sm rounded-lg border border-outline-variant text-on-surface focus:outline-none focus:border-primary transition-colors"
                placeholder="E.g., Deep Pothole on 5th Ave"
              />
            </div>

            <div className="flex flex-col gap-sm">
              <label className="text-label-md font-label-md text-on-surface-variant">Category</label>
              <select
                value={category}
                onChange={e => { resetDuplicateReview(); setCategory(e.target.value); }}
                className="bg-surface p-sm rounded-lg border border-outline-variant text-on-surface focus:outline-none focus:border-primary transition-colors"
              >
                {REPORT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <SmartSuggestion
                title={title}
                description={description}
                onApply={(value) => { resetDuplicateReview(); setCategory(value); }}
              />
            </div>
          </div>

          <div className="flex flex-col gap-sm">
            <label className="text-label-md font-label-md text-on-surface-variant">Description</label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={e => { resetDuplicateReview(); setDescription(e.target.value); }}
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
                onMapClick={(lat, lng) => { resetDuplicateReview(); setLocation({ lat, lng }); }}
                selectedLocation={location}
                showSearch={true}
                showUserLocationButton={true}
                onUserLocationFound={(lat, lng) => { resetDuplicateReview(); setLocation({ lat, lng }); }}
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

          {intelligenceNotice && (
            <div role="status" className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-sm">
              {intelligenceNotice}
            </div>
          )}

          {duplicateCandidates.length > 0 && (
            <div className="bg-primary/5 p-4 rounded-xl border border-primary/30 space-y-3" aria-live="polite">
              <div>
                <h3 className="font-semibold text-on-surface">This may already be reported</h3>
                <p className="text-xs text-on-surface-variant mt-1">
                  Review these nearby, similar issues before creating a new report. Your choice is always final.
                </p>
              </div>
              <div className="space-y-2">
                {duplicateCandidates.map((candidate) => (
                  <div key={candidate.id} className="bg-surface p-3 rounded-lg border border-outline-variant flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <Link href={`/issues/${candidate.id}`} target="_blank" className="font-semibold text-sm text-primary hover:underline">
                        {candidate.title}
                      </Link>
                      <p className="text-xs text-on-surface-variant">
                        {candidate.category} · {candidate.status} · {candidate.distanceMeters} m away · {Math.round(candidate.similarity * 100)}% match
                      </p>
                      <p className="text-[11px] text-on-surface-variant">{candidate.reasons.join(' · ')}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { router.push(`/issues/${candidate.id}#community-actions`); onClose(); }}
                      className="shrink-0 px-3 py-2 rounded-lg bg-primary text-on-primary text-xs font-semibold hover:bg-primary/90"
                    >
                      Same issue
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-1">
                <p className="text-xs text-on-surface-variant">None of these match?</p>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => { setDuplicateCandidates([]); setReviewedDraftKey(draftKey); void submitAfterReview(); }}
                  className="px-3 py-2 rounded-lg border border-primary text-primary text-xs font-semibold hover:bg-primary/10 disabled:opacity-50"
                >
                  Different issue — submit new report
                </button>
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
