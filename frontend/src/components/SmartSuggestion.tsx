'use client';

import { useEffect, useRef, useState } from 'react';
import { recommendDepartment, suggestCategory, type Suggestion } from '@/services/intelligence';
import { REPORT_CATEGORIES } from '@/lib/constants';

export default function SmartSuggestion({ title, description, category, departmentIds, onApply }: {
  title: string; description: string; category?: string; departmentIds?: string[];
  onApply: (value: string) => void;
}) {
  const [result, setResult] = useState<Suggestion | null>(null);
  const [resultKey, setResultKey] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const active = useRef<AbortController | null>(null);
  const draftKey = JSON.stringify([title, description, category]);
  useEffect(() => () => active.current?.abort(), []);
  const analyze = async () => {
    active.current?.abort();
    const controller = new AbortController(); active.current = controller;
    setBusy(true); setMessage(''); setResult(null);
    try {
      const answer = category === undefined
        ? await suggestCategory({ title, description }, controller.signal)
        : await recommendDepartment({ title, description, category }, controller.signal);
      if (!controller.signal.aborted) {
        setResult(answer);
        setResultKey(draftKey);
      }
    } catch {
      if (!controller.signal.aborted) setMessage('Suggestions are unavailable. Please choose manually.');
    } finally { if (!controller.signal.aborted) setBusy(false); }
  };
  const visibleResult = resultKey === draftKey ? result : null;
  const value = category === undefined ? visibleResult?.category : visibleResult?.departmentId;
  const valid = value && (category === undefined ? REPORT_CATEGORIES.some(c => c === value) : departmentIds?.includes(value));
  return <div className="text-sm space-y-2" aria-live="polite">
    <button type="button" disabled={busy || !title.trim() || !description.trim()} onClick={analyze} className="text-primary underline disabled:opacity-50">
      {busy ? 'Checking suggestions…' : category === undefined ? 'Suggest category' : 'Recommend department'}
    </button>
    {message && <p>{message}</p>}
    {visibleResult && <div className="p-3 border border-outline-variant rounded-lg">
      <p>{visibleResult.reason}</p>
      {valid && <button type="button" className="text-primary underline" onClick={() => {
        if (!value) return;
        onApply(value);
        setResult(null);
        setMessage('Suggestion selected. Review your form before saving.');
      }}>
        Use {category === undefined ? visibleResult.category : visibleResult.departmentName}
      </button>}
    </div>}
  </div>;
}
