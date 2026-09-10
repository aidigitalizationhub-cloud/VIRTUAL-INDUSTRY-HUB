type ProjectFields = Record<string, unknown>;

export const protectProjectPublication = (
  fields: ProjectFields,
  options: { create: boolean; ownerEdit?: boolean; grandfathered?: boolean },
): ProjectFields => {
  const project = { ...fields };
  if (options.create) {
    project.visibility = 'Internal';
    project.disclosure_status = 'Pending Review';
    return project;
  }
  if (project.visibility === 'Public' || project.disclosure_status === 'Published') {
    const error = new Error('Projects can only be published through the final publication decision workflow.') as Error & { status?: number };
    error.status = 409;
    throw error;
  }
  if (options.ownerEdit) {
    delete project.disclosure_status;
    if (options.grandfathered) delete project.visibility;
    else project.visibility = 'Internal';
  }
  return project;
};
