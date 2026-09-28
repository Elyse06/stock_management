import { ERROR_MESSAGES } from "../../../constants/api";

export const extractApiError = (err, fallback = ERROR_MESSAGES.SAVE_FAILED) => {
  const data = err?.response?.data;
  if (!data) return fallback;
  if (typeof data === "string") return data;
  if (data.detail) return Array.isArray(data.detail) ? data.detail.join(" ") : data.detail;
  const firstKey = Object.keys(data)[0];
  if (firstKey) {
    const val = data[firstKey];
    return Array.isArray(val) ? val.join(" ") : String(val);
  }
  return fallback;
};