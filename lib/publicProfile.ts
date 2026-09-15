export const PUBLIC_PROFILE_FIELDS = [
  'id',
  'name',
  'title',
  'role',
  'bio',
  'company',
  'department',
  'website_url',
  'website_url_2',
  'website_url_3',
  'website_url_4',
  'avatar_url',
] as const;

export type PublicProfile = Partial<Record<(typeof PUBLIC_PROFILE_FIELDS)[number], unknown>>;

export const toPublicProfile = (profile: Record<string, unknown>): PublicProfile =>
  Object.fromEntries(
    PUBLIC_PROFILE_FIELDS
      .filter((field) => profile[field] !== undefined)
      .map((field) => [field, profile[field]])
  );
