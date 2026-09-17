export const USER_ROLES = ["civic", "admin"] as const;

export const REPORT_STATUSES = [
  "Reported",
  "Verified",
  "Assigned",
  "In Progress",
  "Resolved",
  "Rejected",
  "Duplicate",
  "Reopened",
] as const;

export const REPORT_CATEGORIES = [
  "Roads & Infrastructure",
  "Waste & Sanitation",
  "Water & Drainage",
  "Electricity & Lighting",
  "Public Safety",
  "Parks & Public Spaces",
  "Other",
] as const;

export const REACTION_TYPES = ["affected", "confirmed"] as const;

export const MAX_REPORT_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
export const SUPPORTED_REPORT_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
