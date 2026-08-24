// Shared date formatting helpers - single source of truth for the whole app.

/** "Mar 7" style short date used in lists, chips, and threads. */
export const formatDateShort = (value?: string | number | Date | null): string => {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

/** "Mar 7, 2026" style date used in detail views. */
export const formatDateMedium = (value?: string | number | Date | null): string => {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
};
