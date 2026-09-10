export const shortenUrl = (value: string, maxLength = 58): string => {
  try {
    const url = new URL(value);
    const compact = `${url.hostname}${url.pathname === '/' ? '' : url.pathname}`;
    return compact.length > maxLength ? `${compact.slice(0, maxLength - 1)}…` : compact;
  } catch {
    return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
  }
};
