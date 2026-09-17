'use client';

import { useEffect, useRef, useState } from 'react';
import { recommendDepartment, suggestCategory, type Suggestion } from '@/services/intelligence';
import { REPORT_CATEGORIES } from '@/lib/constants';

export default function SmartSuggestion({ title, description, category, departmentIds, onApply }: {
  title: string; description: string; category?: string; departmentIds?: string[];
  onApply: (value: string) => void;
}) {
  const [result, setResult] = useState<Suggestion | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const active = useRef<AbortController | null>(null);
  useEffect(() => {
    active.current?.abort(); setResult(null); setMessage(''); setBusy(false);
    return () => active.current?.abort();
  }, [title, description, category]);
  const analyze = async () => {
    active.current?.abort();
    const controller = new AbortController(); active.current = controller;
    setBusy(true); setMessage(''); setResult(null);
    try {
      const answer = category === undefined
        ? await suggestCategory({ title, description }, controller.signal)
        : await recommendDepartment({ title, description, category }, controller.signal);
      if (!controller.signal.aborted) setResult(answer);
    } catch {
      if (!controller.signal.aborted) setMessage('Suggestions are unavailable. Please choose manually.');
    } finally { if (!controller.signal.aborted) setBusy(false); }
  };
  const value = category === undefined ? result?.category : result?.departmentId;
  const valid = value && (category === undefined ? REPORT_CATEGORIES.some(c => c === value) : departmentIds?.includes(value));
  return <div className="text-sm space-y-2" aria-live="polite">
    <button type="button" disabled={busy || !title.trim() || !description.trim()} onClick={analyze} className="text-primary underline disabled:opacity-50">
      {busy ? 'Checking suggestions…' : category === undefined ? 'Suggest category' : 'Recommend department'}
    </button>
    {message && <p>{message}</p>}
    {result && <div className="p-3 border border-outline-variant rounded-lg">
      <p>{result.reason}</p>
      {valid && <button type="button" className="text-primary underline" onClick={() => {
        if (!value) return;
        onApply(value);
        setResult(null);
        setMessage('Suggestion selected. Review your form before saving.');
      }}>
        Use {category === undefined ? result.category : result.departmentName}
      </button>}
    </div>}
  </div>;
}
