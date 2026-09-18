import { ReportStatus } from '@/lib/types';
import { StatusPill } from './ui';

export type StatusType = ReportStatus;

interface StatusBadgeProps {
  status: ReportStatus;
  className?: string;
}

export default function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  return <StatusPill status={status} className={className} />;
}

