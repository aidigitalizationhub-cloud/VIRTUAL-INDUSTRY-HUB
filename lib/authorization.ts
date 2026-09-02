export const isReleaseApprovalActive = (status: unknown, now = Date.now()): boolean => {
  if (status === 'released') return true;
  if (typeof status !== 'string' || !status.startsWith('released:')) return false;
  const timestamp = Number(status.slice('released:'.length));
  return Number.isFinite(timestamp) && now - timestamp >= 0 && now - timestamp < 60 * 60 * 1000;
};

export const canAccessReleasedProject = (statuses: unknown[], now = Date.now()): boolean =>
  statuses.some(status => isReleaseApprovalActive(status, now));

export const canSignProjectObject = (
  kind: 'image' | 'brief' | 'document',
  isOwnerOrAdmin: boolean,
  approvalStatuses: unknown[] = [],
  now = Date.now(),
): boolean => {
  if (kind === 'image' || isOwnerOrAdmin) return true;
  return kind === 'brief' && canAccessReleasedProject(approvalStatuses, now);
};

export const canMutateMatch = (userId: string, candidateUserId: string, partnerUserId: string, isAdmin: boolean): boolean =>
  isAdmin || userId === candidateUserId || userId === partnerUserId;

export const isSelfMatchRequest = (authenticatedUserId: string | undefined, requestedUserId: unknown): boolean =>
  Boolean(authenticatedUserId) && authenticatedUserId === requestedUserId;
