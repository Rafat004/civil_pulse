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

export interface Department {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface ReportStatusHistory {
  id: string;
  report_id: string;
  from_status: ReportStatus | null;
  to_status: ReportStatus;
  changed_by: string | null;
  note: string | null;
  created_at: string;
}

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
  department_id?: string | null;
  department?: Department | null;
  duplicate_of?: string | null;
  resolution_note?: string | null;
  resolution_image_url?: string | null;
  resolved_at?: string | null;
  created_at: string;
  updated_at?: string;
  upvotes_count?: number;
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

export interface Comment {
  id: string;
  report_id: string;
  user_id: string;
  body: string;
  created_at: string;
  updated_at: string;
  author_role?: UserRole | null;
  author_name?: string | null;
}

export type MapReport = Pick<
  Report,
  "id" | "title" | "status" | "lat" | "lng" | "image_url"
>;


