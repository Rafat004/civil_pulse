export function getStatusColor(status?: string): string {
  switch (status) {
    case 'Reported':
      return '#2563eb'; // Blue 600
    case 'Verified':
      return '#7c3aed'; // Purple 600
    case 'Assigned':
      return '#4f46e5'; // Indigo 600
    case 'In Progress':
      return '#d97706'; // Amber 600
    case 'Resolved':
      return '#16a34a'; // Green 600
    case 'Rejected':
      return '#dc2626'; // Red 600
    case 'Duplicate':
      return '#475569'; // Slate 600
    case 'Reopened':
      return '#ea580c'; // Orange 600
    default:
      return '#2563eb';
  }
}

export function getCategoryIconSymbol(category?: string): string {
  switch (category) {
    case 'Roads & Infrastructure':
      return 'construction';
    case 'Waste & Sanitation':
      return 'delete';
    case 'Water & Drainage':
      return 'water_drop';
    case 'Electricity & Lighting':
      return 'lightbulb';
    case 'Public Safety':
      return 'shield_heart';
    case 'Parks & Public Spaces':
      return 'park';
    case 'Other':
    default:
      return 'report_problem';
  }
}
