import { intelligenceApiUrl } from '@/lib/config';
import type { ReportCategory, ReportStatus } from '@/lib/types';

export interface AnalysisText { title: string; description: string }
export interface DuplicateDraft extends AnalysisText { category: string; lat: number; lng: number }
export interface DuplicateCandidate {
  id: string; title: string; category: ReportCategory; status: ReportStatus;
  distanceMeters: number; similarity: number; reasons: string[];
}
export interface Suggestion {
  category: ReportCategory | null; departmentId: string | null;
  departmentName: string | null; reason: string;
}
async function request<T>(path: string, body: unknown, signal: AbortSignal): Promise<T> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal.addEventListener('abort', abort, { once: true });
  if (signal.aborted) controller.abort();
  const timer = setTimeout(abort, 5000);
  try {
    const response = await fetch(intelligenceApiUrl(path), {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body), signal: controller.signal,
    });
    if (!response.ok) throw new Error('Suggestions are unavailable; you can still continue manually.');
    return await response.json() as T;
  } finally { clearTimeout(timer); signal.removeEventListener('abort', abort); }
}
export async function findDuplicates(draft: DuplicateDraft, signal: AbortSignal) {
  const result = await request<{ candidates: DuplicateCandidate[] }>('/cluster-duplicates', draft, signal);
  if (!Array.isArray(result.candidates) || result.candidates.some(c => !c.id || !c.title || !Array.isArray(c.reasons))) throw new Error('Invalid suggestions');
  return result.candidates;
}
export const suggestCategory = (text: AnalysisText, signal: AbortSignal) => request<Suggestion>('/suggest-category', text, signal);
export const recommendDepartment = (text: AnalysisText & { category: string }, signal: AbortSignal) => request<Suggestion>('/recommend-department', text, signal);
