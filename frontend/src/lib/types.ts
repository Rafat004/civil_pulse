import type {
  REACTION_TYPES,
  REPORT_CATEGORIES,
  REPORT_STATUSES,
  USER_ROLES,
} from "./constants";

export type UserRole = (typeof USER_ROLES)[number];
export type ReportStatus = (typeof REPORT_STATUSES)[number];
export type ReportCategory = (typeof REPORT_CATEGORIES)[number];
export type ReactionType = (typeof REACTION_TYPES)[number];

export interface Report {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: ReportCategory;
  status: ReportStatus;
  zone: string;
  lat: number;
  lng: number;
  image_url: string | null;
  created_at: string;
  updated_at?: string;
}

export interface ReportReaction {
  id: string;
  report_id: string;
  user_id: string;
  type: ReactionType;
  created_at: string;
}

export interface ReactionSummary {
  affected: number;
  confirmed: number;
  currentUser: Record<ReactionType, boolean>;
}

export type MapReport = Pick<
  Report,
  "id" | "title" | "status" | "lat" | "lng" | "image_url"
>;
