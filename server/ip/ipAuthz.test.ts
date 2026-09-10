import { describe, expect, it } from 'vitest';
import { canViewDisclosure, canAdminReview, canTtoReview, canDecidePublication } from './ipAuthz';

describe('IP authorization', () => {
  it('owner can view own case', () => {
    expect(canViewDisclosure({ disclosureResearcherId: 'u1', viewerId: 'u1', viewerRole: 'Researcher' })).toBe(true);
  });
  it('stranger cannot view', () => {
    expect(canViewDisclosure({ disclosureResearcherId: 'u1', viewerId: 'u2', viewerRole: 'Researcher' })).toBe(false);
  });
  it('admin and TTO can view', () => {
    expect(canViewDisclosure({ disclosureResearcherId: 'u1', viewerId: 'a', viewerRole: 'Admin' })).toBe(true);
    expect(canViewDisclosure({ disclosureResearcherId: 'u1', viewerId: 't', viewerRole: 'TTO' })).toBe(true);
  });
  it('limits status-aware TTO access to TTO review states', () => {
    expect(canViewDisclosure({ disclosureResearcherId: 'u1', viewerId: 't', viewerRole: 'TTO', disclosureStatus: 'tto_review' })).toBe(true);
    expect(canViewDisclosure({ disclosureResearcherId: 'u1', viewerId: 't', viewerRole: 'TTO', disclosureStatus: 'super_admin_review' })).toBe(true);
    expect(canViewDisclosure({ disclosureResearcherId: 'u1', viewerId: 't', viewerRole: 'TTO', disclosureStatus: 'admin_review' })).toBe(false);
  });
  it('separates admin, TTO, and super-admin powers', () => {
    expect(canAdminReview('Admin')).toBe(true);
    expect(canAdminReview('Researcher')).toBe(false);
    expect(canTtoReview('TTO')).toBe(true);
    expect(canTtoReview('Researcher')).toBe(false);
    expect(canDecidePublication('Super Admin')).toBe(true);
    expect(canDecidePublication('TTO')).toBe(false);
  });
});
