import { ReportStatus } from '@/lib/types';

export type StatusType = ReportStatus;

interface StatusBadgeProps {
  status: ReportStatus;
  className?: string;
}

export default function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const getStyles = () => {
    switch (status) {
      case 'Reported':
        return 'bg-orange-100 text-orange-700 border border-orange-200';
      case 'Verified':
        return 'bg-blue-100 text-blue-700 border border-blue-200';
      case 'In Progress':
        return 'bg-amber-100 text-amber-700 border border-amber-200';
      case 'Resolved':
        return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
      case 'Assigned':
        return 'bg-purple-100 text-purple-700 border border-purple-200';
      case 'Rejected':
        return 'bg-red-100 text-red-700 border border-red-200';
      case 'Duplicate':
        return 'bg-gray-100 text-gray-700 border border-gray-200';
      case 'Reopened':
        return 'bg-yellow-100 text-yellow-700 border border-yellow-200';
      default:
        return 'bg-surface-variant text-on-surface-variant';
    }
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStyles()} ${className}`}>
      {status}
    </span>
  );
}


