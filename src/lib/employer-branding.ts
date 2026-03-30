type BrandableJob = {
  employer_id?: string | null;
  company_name?: string | null;
  logo_url?: string | null;
};

type EmployerBranding = {
  id: string;
  company_name?: string | null;
  logo_url?: string | null;
};

function normalizeOptionalString(value: unknown) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || null;
  }

  if (value == null) {
    return null;
  }

  const trimmed = String(value).trim();
  return trimmed || null;
}

export function applyEmployerBrandingToJob<T extends BrandableJob>(
  job: T,
  employer: EmployerBranding | null | undefined,
): T {
  if (!employer) {
    return job;
  }

  const companyName = normalizeOptionalString(employer.company_name);
  const logoUrl = normalizeOptionalString(employer.logo_url);

  return {
    ...job,
    company_name: companyName ?? job.company_name ?? null,
    logo_url: logoUrl ?? job.logo_url ?? null,
  };
}
