import { describe, expect, it } from 'vitest';
import { toPublicProfile } from './publicProfile';

describe('public profile projection', () => {
  it('keeps only explicitly safe public fields', () => {
    expect(toPublicProfile({
      id: 'profile-id',
      name: 'Public Name',
      role: 'Researcher',
      title: 'Principal Investigator',
      email: 'private@example.com',
      ai_profile: { personal_information: { phone: 'private' } },
      education_level: 'Doctorate',
      needs_students: true,
    })).toEqual({
      id: 'profile-id',
      name: 'Public Name',
      role: 'Researcher',
      title: 'Principal Investigator',
    });
  });

  it('preserves falsy safe values without adding private fields', () => {
    expect(toPublicProfile({ id: 'profile-id', name: '', bio: null, email: 'private@example.com' })).toEqual({
      id: 'profile-id',
      name: '',
      bio: null,
    });
  });
});
