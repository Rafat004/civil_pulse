import {
  MAX_REPORT_IMAGE_SIZE_BYTES,
  SUPPORTED_REPORT_IMAGE_TYPES,
} from "./constants";

export function validateReportImage(file: File): string | null {
  if (!SUPPORTED_REPORT_IMAGE_TYPES.includes(file.type as (typeof SUPPORTED_REPORT_IMAGE_TYPES)[number])) {
    return "Choose a JPEG, PNG, or WebP image.";
  }

  if (file.size > MAX_REPORT_IMAGE_SIZE_BYTES) {
    return "The image must be 5 MB or smaller.";
  }

  return null;
}
