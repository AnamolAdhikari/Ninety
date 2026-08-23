const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const opaqueIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const isSafeSlug = (value: string, max = 80) => value.length > 0 && value.length <= max && slugPattern.test(value);
export const isSafeOpaqueId = (value: string, max = 160) => value.length > 0 && value.length <= max && opaqueIdPattern.test(value);
export function isValidIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}
export const normalizeSearchQuery = (value: string | null) => (value ?? "").trim().replace(/\s+/g, " ").slice(0, 80);
