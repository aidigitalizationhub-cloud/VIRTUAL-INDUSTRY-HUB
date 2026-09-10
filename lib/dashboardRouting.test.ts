import { describe, expect, it } from 'vitest';
import { dashboardLandingPath, hasDashboardCapability, isAdministrativeRole, isDashboardPathAllowed, legacyDashboardTabPath } from './dashboardRouting';

describe('dashboard routing and capabilities', () => {
  it('routes each role to its workspace', () => {
    expect(dashboardLandingPath('Researcher')).toBe('/dashboard/overview');
    expect(dashboardLandingPath('Admin')).toBe('/dashboard/admin/overview');
    expect(dashboardLandingPath('TTO/IP')).toBe('/dashboard/overview');
  });

  it('normalizes legacy query tabs', () => {
    expect(legacyDashboardTabPath('messages', 'Researcher')).toBe('/dashboard/messages');
     expect(legacyDashboardTabPath('publication-decisions', 'Admin')).toBe('/dashboard/admin/overview');
    expect(legacyDashboardTabPath('unknown', 'Admin')).toBe('/dashboard/admin/overview');
  });

  it('keeps reviewer capabilities separate while retaining Admin fallback', () => {
    expect(hasDashboardCapability('Researcher', 'reviewDisclosure')).toBe(false);
    expect(hasDashboardCapability('TTO', 'reviewTto')).toBe(true);
    expect(hasDashboardCapability('TTO', 'decidePublication')).toBe(false);
    expect(hasDashboardCapability('Admin', 'reviewTto')).toBe(true);
    expect(hasDashboardCapability('Admin', 'decidePublication')).toBe(true);
  });

  it('grants no capability to missing or unsupported roles', () => {
    expect(hasDashboardCapability(undefined, 'useWorkspace')).toBe(false);
    expect(hasDashboardCapability('Guest', 'useWorkspace')).toBe(false);
  });

  it('recognizes administrative roles for onboarding and workspace access', () => {
    expect(isAdministrativeRole('Admin')).toBe(true);
    expect(isAdministrativeRole('Super Admin')).toBe(true);
    expect(isAdministrativeRole('TTO/IP')).toBe(true);
    expect(isAdministrativeRole('Researcher')).toBe(false);
  });

  it('allows TTO detail pages under the guarded TTO workspace', () => {
    expect(isDashboardPathAllowed('TTO', '/dashboard/tto/disclosures/case-123')).toBe(true);
    expect(isDashboardPathAllowed('TTO', '/dashboard/admin/disclosures')).toBe(false);
  });
});
