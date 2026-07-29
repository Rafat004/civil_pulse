export type StatusType = 'Reported' | 'Verified' | 'In Progress' | 'Resolved';

interface StatusBadgeProps {
  status: StatusType;
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
      default:
        return 'bg-surface-variant text-on-surface-variant';
    }
  };

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] md:text-xs font-medium ${getStyles()} ${className}`}>
      {status}
    </span>
  );
}

