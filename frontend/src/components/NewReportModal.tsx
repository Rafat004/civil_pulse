import React, { useState, useEffect, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, Check, ChevronRight, FileImage, MapPin, Send, Sparkles, X } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from './AuthProvider';
import { validateReportImage } from '@/lib/images';
import { REPORT_CATEGORIES } from '@/lib/constants';
import SmartSuggestion from './SmartSuggestion';
import { findDuplicates, type DuplicateCandidate } from '@/services/intelligence';
import { Button, InlineError, Surface } from '@/components/ui';

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

  const reportSteps: Array<[string, string, boolean]> = [
    ['1', 'Summary', Boolean(title.trim() && description.trim())],
    ['2', 'Category', Boolean(category)],
    ['3', 'Location', Boolean(location)],
    ['4', 'Review', Boolean(imageFile || duplicateCandidates.length || reviewedDraftKey)],
  ];

  return (
    <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-[#172535]/40 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="new-report-title" className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-t-2xl border border-[#d8d6cf] bg-[#fffefa] shadow-[0_24px_80px_rgba(23,37,53,0.22)] sm:rounded-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[#d8d6cf] bg-[#fffefa]/95 px-5 py-4 backdrop-blur md:px-7">
          <div>
            <p className="civic-kicker mb-1">Community report</p>
            <h2 id="new-report-title" className="font-headline-md text-headline-md font-bold tracking-[-0.03em] text-on-surface">Report a civic issue</h2>
            <p className="mt-1 text-xs text-on-surface-variant">Share enough context for your neighbours and city teams to act.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close report form" className="civic-focus inline-flex h-10 w-10 items-center justify-center rounded-xl text-on-surface-variant transition-colors hover:bg-[#ece9e1] hover:text-primary">
            <X size={19} />
          </button>
        </div>

        <div className="grid grid-cols-4 gap-2 px-5 pt-5 md:px-7">
          {reportSteps.map(([number, label, complete], index) => (
            <div key={number} className="flex min-w-0 items-center gap-2">
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-extrabold ${complete ? 'bg-[#e8f4eb] text-[#39704a]' : 'bg-[#eeece6] text-on-surface-variant'}`}>{complete ? <Check size={14} /> : number}</span>
              <span className="hidden truncate text-xs font-bold text-on-surface-variant sm:block">{label}</span>
              {index < 3 && <ChevronRight className="ml-auto text-[#c4c1b8]" size={14} />}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6 p-5 md:p-7">
          {error && (
            <InlineError><span className="inline-flex items-center gap-2"><AlertCircle size={16} />{error}</span></InlineError>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
            <div className="flex flex-col gap-sm">
              <label className="text-sm font-bold text-on-surface" htmlFor="report-title">Short title</label>
              <input
                required
                value={title}
                onChange={e => { resetDuplicateReview(); setTitle(e.target.value); }}
                id="report-title"
                className="civic-focus min-h-11 rounded-xl border border-[#d8d6cf] bg-[#fffefa] px-3 text-sm text-on-surface transition-colors placeholder:text-on-surface-variant/70 focus:border-primary"
                placeholder="E.g., Deep Pothole on 5th Ave"
              />
            </div>

            <div className="flex flex-col gap-sm">
              <label className="text-sm font-bold text-on-surface" htmlFor="report-category">Category</label>
              <select
                id="report-category"
                value={category}
                onChange={e => { resetDuplicateReview(); setCategory(e.target.value); }}
                className="civic-focus min-h-11 rounded-xl border border-[#d8d6cf] bg-[#fffefa] px-3 text-sm text-on-surface transition-colors focus:border-primary"
              >
                {REPORT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <div className="flex items-center gap-1 text-xs text-on-surface-variant"><Sparkles size={13} className="text-[#9a6119]" />Category suggestions are advisory.</div>
              <SmartSuggestion
                title={title}
                description={description}
                onApply={(value) => { resetDuplicateReview(); setCategory(value); }}
              />
            </div>
          </div>

          <div className="flex flex-col gap-sm">
            <label className="text-sm font-bold text-on-surface" htmlFor="report-description">Description</label>
            <textarea
              required
              id="report-description"
              rows={3}
              value={description}
              onChange={e => { resetDuplicateReview(); setDescription(e.target.value); }}
              className="civic-focus min-h-28 rounded-xl border border-[#d8d6cf] bg-[#fffefa] p-3 text-sm leading-6 text-on-surface transition-colors placeholder:text-on-surface-variant/70 focus:border-primary"
              placeholder="Provide details about the issue..."
            />
          </div>

          <div className="flex flex-col gap-sm">
            <div className="flex items-center justify-between">
              <label className="text-label-md font-label-md text-on-surface-variant">
                Location (Click map to drop pin)
              </label>
              {location && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                  <MapPin size={13} />
                  Pin: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                </span>
              )}
            </div>

            <div className="relative z-0 h-[250px] overflow-hidden rounded-2xl border border-[#d8d6cf]">
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
            <Surface subtle className="space-y-2 p-4">
              <div className="flex items-center gap-1.5 text-xs font-bold text-on-surface">
                <MapPin className="text-primary" size={16} />
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
            </Surface>
          )}

          {intelligenceNotice && (
            <div role="status" className="rounded-xl border border-[#ecd28b] bg-[#fff7e2] p-3 text-sm text-[#84651a]">
              {intelligenceNotice}
            </div>
          )}

          {duplicateCandidates.length > 0 && (
            <Surface subtle className="space-y-3 border-primary/30 p-4" aria-live="polite">
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
            </Surface>
          )}

          <div className="flex flex-col gap-3">
            <div>
              <p className="text-sm font-bold text-on-surface">Evidence photo <span className="font-normal text-on-surface-variant">(optional)</span></p>
              <p className="mt-1 text-xs text-on-surface-variant">JPG, PNG, or WebP · maximum 5 MB</p>
            </div>
            <label htmlFor="report-image" className="civic-focus flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[#c4bdaf] bg-[#faf9f5] px-5 py-8 text-center transition-colors hover:border-primary hover:bg-[#f5f1e8]">
              <FileImage className="text-primary" size={24} />
              <span className="text-sm font-bold text-on-surface">{imageFile ? imageFile.name : 'Choose an image to attach'}</span>
              <span className="text-xs text-on-surface-variant">Browse from your device</span>
            </label>
            <input
              id="report-image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageChange}
              className="sr-only"
            />
          </div>

          <div className="flex flex-col-reverse justify-end gap-3 border-t border-[#d8d6cf] pt-5 sm:flex-row">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? <><span className="inline-block animate-spin"><ChevronRight size={16} /></span>Checking report...</> : <><Send size={16} />Submit report</>}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
