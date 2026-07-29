import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabaseClient';

const MapComponent = dynamic(() => import('@/components/MapComponent'), { ssr: false });

interface NewReportModalProps {
  onClose: () => void;
}

import { useAuth } from './AuthProvider';

export default function NewReportModal({ onClose }: NewReportModalProps) {
  const { user } = useAuth();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Infrastructure');
  const [zone, setZone] = useState('Zone 1');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      // 1. Check for duplicates using Intelligence API
      const dupCheckRes = await fetch('http://localhost:8082/api/v1/intelligence/cluster-duplicates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat: location.lat, lng: location.lng, title })
      });
      const dupCheckData = await dupCheckRes.json();
      
      if (dupCheckData.is_duplicate) {
        if (!confirm(`Warning: ${dupCheckData.message}\n\nDo you still want to submit this?`)) {
          setLoading(false);
          return;
        }
      }

      // 2. Upload Image (if provided)
      let image_url = null;
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const { data, error: uploadError } = await supabase.storage
          .from('reports')
          .upload(fileName, imageFile);
          
        if (uploadError) {
          throw new Error(`Image upload failed: ${uploadError.message}`);
        }
        
        const { data: publicUrlData } = supabase.storage.from('reports').getPublicUrl(fileName);
        image_url = publicUrlData.publicUrl;
      }

      // 3. Insert into Supabase
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
        upvotes_count: 0
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
            
            <div className="grid grid-cols-2 gap-md">
              <div className="flex flex-col gap-sm">
                <label className="text-label-md font-label-md text-on-surface-variant">Category</label>
                <select 
                  value={category} 
                  onChange={e => setCategory(e.target.value)} 
                  className="bg-surface p-sm rounded-lg border border-outline-variant text-on-surface focus:outline-none focus:border-primary transition-colors"
                >
                  <option>Infrastructure</option>
                  <option>Sanitation</option>
                  <option>Utilities</option>
                  <option>Public Safety</option>
                </select>
              </div>
              
              <div className="flex flex-col gap-sm">
                <label className="text-label-md font-label-md text-on-surface-variant">Zone</label>
                <select 
                  value={zone} 
                  onChange={e => setZone(e.target.value)} 
                  className="bg-surface p-sm rounded-lg border border-outline-variant text-on-surface focus:outline-none focus:border-primary transition-colors"
                >
                  <option>Zone 1</option>
                  <option>Zone 2</option>
                  <option>Zone 3</option>
                  <option>Zone 4</option>
                  <option>Zone 5</option>
                </select>
              </div>
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
            <label className="text-label-md font-label-md text-on-surface-variant">Location (Click map to drop pin)</label>
            <div className="h-[250px] rounded-lg overflow-hidden border border-outline-variant relative z-0">
              <MapComponent 
                mapId="modal-map"
                interactive={true} 
                onMapClick={(lat, lng) => setLocation({ lat, lng })}
                selectedLocation={location}
                showSearch={true}
              />
            </div>
            {location && <span className="text-xs text-primary">Pin placed at: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}</span>}
          </div>

          <div className="flex flex-col gap-sm">
            <label className="text-label-md font-label-md text-on-surface-variant">Photo Evidence (Optional)</label>
            <input 
              type="file" 
              accept="image/*" 
              onChange={e => setImageFile(e.target.files?.[0] || null)} 
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
