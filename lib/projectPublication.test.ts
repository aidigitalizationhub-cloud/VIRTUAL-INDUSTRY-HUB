import { describe, expect, it } from 'vitest';
import { protectProjectPublication } from './projectPublication';

describe('project publication protection', () => {
  it('forces new projects into private review regardless of client input', () => {
    expect(protectProjectPublication({ title: 'A', visibility: 'Public', disclosure_status: 'Published' }, { create: true })).toMatchObject({
      visibility: 'Internal', disclosure_status: 'Pending Review',
    });
  });

  it('prevents direct publication during updates', () => {
    expect(() => protectProjectPublication({ visibility: 'Public' }, { create: false })).toThrow(/final publication decision/);
    expect(() => protectProjectPublication({ disclosure_status: 'Published' }, { create: false })).toThrow(/final publication decision/);
  });

  it('keeps researcher edits private without allowing workflow status edits', () => {
    expect(protectProjectPublication({ title: 'Updated', visibility: 'Restricted', disclosure_status: 'Rejected' }, { create: false, ownerEdit: true })).toEqual({ title: 'Updated', visibility: 'Internal' });
  });

  it('does not downgrade grandfathered public records during ordinary edits', () => {
    expect(protectProjectPublication({ title: 'Updated' }, { create: false, ownerEdit: true, grandfathered: true })).toEqual({ title: 'Updated' });
  });

  it('allows administrators to record non-public workflow states', () => {
    expect(protectProjectPublication({ visibility: 'Internal', disclosure_status: 'Documents Requested' }, { create: false })).toEqual({ visibility: 'Internal', disclosure_status: 'Documents Requested' });
  });
});
