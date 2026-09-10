// Centralised IP role checks. Frontend enum lacks TTO/Super Admin,
// so backend accepts those role strings from profiles.role as well as Admin fallback.

export const isAdminRole = (role: unknown): boolean =>
  role === 'Admin' || role === 'Super Admin';

export const isTtoRole = (role: unknown): boolean =>
  role === 'TTO' || role === 'TTO/IP' || role === 'IP Office' || role === 'Admin';

export const isSuperAdminRole = (role: unknown): boolean =>
  role === 'Super Admin' || role === 'Admin';

export const canViewDisclosure = (params: {
  disclosureResearcherId: string;
  viewerId: string;
  viewerRole: unknown;
  disclosureStatus?: string;
}): boolean => {
  if (params.viewerId === params.disclosureResearcherId) return true;
  if (isAdminRole(params.viewerRole)) return true;
  if (isTtoRole(params.viewerRole)) return params.disclosureStatus === undefined || ['tto_review', 'tto_completed', 'super_admin_review'].includes(params.disclosureStatus);
  if (isSuperAdminRole(params.viewerRole)) return true;
  return false;
};

export const canAdminReview = (role: unknown): boolean => isAdminRole(role);

export const canTtoReview = (role: unknown): boolean => isTtoRole(role);

export const canDecidePublication = (role: unknown): boolean => isSuperAdminRole(role);
