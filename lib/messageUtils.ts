// Reveal-request detection: matches the current bracket tag and the legacy
// emoji-prefixed format so older messages keep rendering correctly.
export const isRevealRequestMessage = (text?: string | null): boolean =>
  !!text && (
    text.includes('[REVEAL_REQUEST]') ||
    text.includes('\uD83D\uDD10 Technical Disclosure Request')
  );
