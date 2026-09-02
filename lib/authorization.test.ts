import { describe, expect, it } from 'vitest';
import {
  canAccessReleasedProject,
  canMutateMatch,
  canSignProjectObject,
  isReleaseApprovalActive,
  isSelfMatchRequest,
} from './authorization';

describe('authorization boundaries', () => {
  const now = Date.parse('2026-09-02T12:00:00.000Z');

  it('accepts permanent and active timed release approvals only', () => {
    expect(isReleaseApprovalActive('released', now)).toBe(true);
    expect(isReleaseApprovalActive(`released:${now - 59 * 60 * 1000}`, now)).toBe(true);
    expect(isReleaseApprovalActive(`released:${now - 60 * 60 * 1000}`, now)).toBe(false);
    expect(isReleaseApprovalActive(`released:${now + 1}`, now)).toBe(false);
    expect(isReleaseApprovalActive('accepted', now)).toBe(false);
  });

  it('grants brief access only when at least one approval is active', () => {
    expect(canAccessReleasedProject(['declined', `released:${now - 10_000}`], now)).toBe(true);
    expect(canAccessReleasedProject(['declined', `released:${now - 3_600_001_000}`], now)).toBe(false);
  });

  it('never grants supporting-document access through a reveal approval', () => {
    expect(canSignProjectObject('image', false, [], now)).toBe(true);
    expect(canSignProjectObject('brief', false, [`released:${now - 10_000}`], now)).toBe(true);
    expect(canSignProjectObject('document', false, ['released'], now)).toBe(false);
    expect(canSignProjectObject('document', true, [], now)).toBe(true);
  });

  it('allows match mutation only to participants or admins', () => {
    expect(canMutateMatch('candidate', 'candidate', 'partner', false)).toBe(true);
    expect(canMutateMatch('partner', 'candidate', 'partner', false)).toBe(true);
    expect(canMutateMatch('admin', 'candidate', 'partner', true)).toBe(true);
    expect(canMutateMatch('outsider', 'candidate', 'partner', false)).toBe(false);
  });

  it('rejects match requests that target another user', () => {
    expect(isSelfMatchRequest('user-1', 'user-1')).toBe(true);
    expect(isSelfMatchRequest('user-1', 'user-2')).toBe(false);
    expect(isSelfMatchRequest(undefined, 'user-1')).toBe(false);
  });
});
