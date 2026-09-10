export type DashboardTab = 'overview' | 'matches' | 'messages' | 'profile';

export type AdminPage = 'overview' | 'users' | 'disclosures' | 'projects' | 'news' | 'audit' | 'decisions';

export type DashboardCapability =
  | 'useWorkspace'
  | 'administerPlatform'
  | 'reviewDisclosure'
  | 'reviewTto'
  | 'decidePublication';

const TTO_ROLES = new Set(['TTO', 'TTO/IP', 'IP Office']);

export const isTtoRole = (role: unknown): boolean => typeof role === 'string' && TTO_ROLES.has(role);

export const canCreateDisclosure = (role: unknown): boolean => role === 'Researcher';

export const isAdministrativeRole = (role: unknown): boolean =>
  role === 'Admin' || role === 'Super Admin' || isTtoRole(role);

export const hasDashboardCapability = (role: unknown, capability: DashboardCapability): boolean => {
  if (typeof role !== 'string') return false;
  if (capability === 'useWorkspace') return ['Student', 'Researcher', 'Investor', 'Industry/Partner', 'Admin', 'Super Admin', ...TTO_ROLES].includes(role);
  if (capability === 'administerPlatform' || capability === 'reviewDisclosure') return role === 'Admin' || role === 'Super Admin';
  if (capability === 'reviewTto') return isAdministrativeRole(role);
  return role === 'Admin' || role === 'Super Admin';
};

export const dashboardLandingPath = (role: unknown): string => {
  if (role === 'Admin' || role === 'Super Admin') return '/dashboard/admin/overview';
  if (isTtoRole(role)) return '/dashboard/overview';
  return '/dashboard/overview';
};

export const isDashboardPathAllowed = (role: unknown, pathname: string): boolean => {
  if (pathname === '/dashboard') return true;
  if (isTtoRole(role)) {
    return pathname === '/dashboard/overview' || pathname.startsWith('/dashboard/tto/disclosures');
  }
  if (pathname.startsWith('/dashboard/admin/') || pathname.startsWith('/dashboard/tto/') || pathname.startsWith('/dashboard/access-requests')) {
    return role === 'Admin' || role === 'Super Admin';
  }
  return pathname.startsWith('/dashboard/');
};

export const legacyDashboardTabPath = (tab: string | null, role: unknown): string => {
  const paths: Record<string, string> = {
    overview: dashboardLandingPath(role),
    matches: '/dashboard/matches',
    messages: '/dashboard/messages',
    profile: '/dashboard/profile',
    disclosures: dashboardLandingPath(role),
    'admin-disclosures': '/dashboard/admin/disclosures',
    'tto-queue': '/dashboard/tto/disclosures',
    'tto-review': '/dashboard/tto/disclosures',
    'publication-decisions': dashboardLandingPath(role),
    'access-requests': '/dashboard/access-requests',
  };
  return tab && paths[tab] ? paths[tab] : dashboardLandingPath(role);
};
