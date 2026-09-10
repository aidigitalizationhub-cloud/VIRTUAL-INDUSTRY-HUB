import { describe, expect, it } from 'vitest';
import { isFinalReviewStatus, isIpWorkflowStatus, transitionIpWorkflow } from './ipWorkflow';

describe('IP workflow transitions', () => {
  it('submits a draft without skipping Admin review', () => {
    expect(transitionIpWorkflow('draft', 'submit')).toEqual({ status: 'submitted' });
  });

  it('sends a TTO-routed draft straight to TTO review', () => {
    expect(transitionIpWorkflow('draft', 'submit_to_tto')).toEqual({
      status: 'tto_review',
      route: 'tto_review',
    });
  });

  it('supports the TTO review route', () => {
    expect(transitionIpWorkflow('admin_review', 'send_to_tto')).toEqual({
      status: 'tto_review',
      route: 'tto_review',
    });
  });

  it('records the TTO opt-out route without treating it as approval', () => {
    expect(transitionIpWorkflow('admin_review', 'opt_out_tto')).toEqual({
      status: 'ai_screening',
      route: 'tto_opt_out',
    });
  });

  it('hands completed TTO reviews to the Admin Disclosure page', () => {
    expect(transitionIpWorkflow('tto_review', 'complete_tto_review')).toEqual({ status: 'tto_completed' });
  });

  it('queues a TTO review for Super Admin publication review', () => {
    expect(transitionIpWorkflow('tto_review', 'send_to_super_admin')).toEqual({ status: 'super_admin_review' });
    expect(transitionIpWorkflow('tto_completed', 'send_to_super_admin')).toEqual({ status: 'super_admin_review' });
  });

  it('requires Super Admin review before publication', () => {
    expect(() => transitionIpWorkflow('ai_screening', 'publish')).toThrow();
    expect(transitionIpWorkflow('super_admin_review', 'publish')).toEqual({ status: 'published' });
    expect(transitionIpWorkflow('super_admin_review', 'restrict')).toEqual({ status: 'restricted' });
    expect(transitionIpWorkflow('super_admin_review', 'hold_confidential')).toEqual({ status: 'confidential_hold' });
    expect(transitionIpWorkflow('super_admin_review', 'request_researcher_action')).toEqual({ status: 'researcher_action_required' });
    expect(transitionIpWorkflow('super_admin_review', 'reject')).toEqual({ status: 'rejected' });
  });

  it('identifies records reserved for the final review page', () => {
    expect(isFinalReviewStatus('super_admin_review')).toBe(true);
    expect(isFinalReviewStatus('tto_review')).toBe(false);
  });

  it('does not allow terminal statuses to change', () => {
    expect(() => transitionIpWorkflow('published', 'restrict')).toThrow();
    expect(() => transitionIpWorkflow('rejected', 'resubmit')).toThrow();
  });

  it('validates persisted status values', () => {
    expect(isIpWorkflowStatus('tto_review')).toBe(true);
    expect(isIpWorkflowStatus('Approved')).toBe(false);
    expect(isIpWorkflowStatus(null)).toBe(false);
  });
});
