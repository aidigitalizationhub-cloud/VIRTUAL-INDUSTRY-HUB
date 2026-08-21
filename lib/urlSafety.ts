// Returns a safe http(s) URL for external links, or '' when the input cannot be
// trusted as a web address (e.g. javascript: / data: URIs). Bare domains get an
// https:// prefix.
export const safeExternalUrl = (raw: string | null | undefined): string => {
  if (!raw) return '';
  const url = String(raw).trim();
  if (url === '') return '';
  if (/^https?:\/\//i.test(url)) return url;
  // Any other explicit scheme (javascript:, data:, vbscript:, ...) is rejected.
  if (/^[a-z][a-z0-9+.-]*:/i.test(url)) return '';
  return `https://${url}`;
};
