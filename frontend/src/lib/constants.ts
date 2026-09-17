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

export function getValidNextStatuses(currentStatus: string): string[] {
  switch (currentStatus) {
    case "Reported":
      return ["Reported", "Verified", "Rejected", "Duplicate"];
    case "Verified":
      return ["Verified", "Assigned", "Duplicate"];
    case "Assigned":
      return ["Assigned", "In Progress"];
    case "In Progress":
      return ["In Progress", "Resolved"];
    case "Resolved":
      return ["Resolved", "Reopened"];
    case "Reopened":
      return ["Reopened", "In Progress"];
    case "Rejected":
    case "Duplicate":
    default:
      return [currentStatus];
  }
}

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

export const NOTIFICATION_TYPES = [
  "STATUS_CHANGED",
  "NEW_COMMENT",
  "OFFICIAL_UPDATE",
  "REPORT_RESOLVED",
  "REPORT_REOPENED",
] as const;

export const MAX_REPORT_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
export const SUPPORTED_REPORT_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
