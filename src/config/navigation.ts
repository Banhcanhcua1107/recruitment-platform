export type WorkspaceKey = "candidate" | "hr";

export interface NavigationItem {
  id: string;
  label: string;
  href: string;
  icon?: string;
}

export interface WorkspaceNavigationConfig {
  key: WorkspaceKey;
  // TODO(multi-role): derive access from account memberships instead of one role per workspace.
  role: WorkspaceKey;
  label: string;
  workspaceLabel: string;
  basePath: string;
  homeHref: string;
  sidebarItems: NavigationItem[];
  accountMenuItems: NavigationItem[];
  legacyPrefixes: string[];
}

export const PRIMARY_NAV_ITEMS: NavigationItem[] = [
  { id: "home", label: "Trang chủ", href: "/" },
  { id: "jobs", label: "Tìm việc làm", href: "/jobs" },
  { id: "contact", label: "Liên hệ", href: "/contact" },
];

export const ROLE_LABELS: Record<string, string> = {
  GUEST: "Khách",
  candidate: "Ứng viên",
  hr: "Nhà tuyển dụng",
};

export const ROLE_SELECTION_PATHS = ["/role-selection", "/register/role-selection"] as const;
export const AUTH_ROUTE_PREFIXES = ["/login", "/register"] as const;

export const CANDIDATE_CANONICAL_ROUTES = {
  overview: "/candidate/overview",
  profile: "/candidate/profile",
  cv: "/candidate/cv",
  jobs: "/candidate/jobs",
  settings: "/candidate/settings",
} as const;

export const HR_CANONICAL_ROUTES = {
  overview: "/hr/overview",
  candidates: "/hr/candidates",
  jobs: "/hr/jobs",
  company: "/hr/company",
  settings: "/hr/settings",
} as const;

const WORKSPACE_CONFIGS: Record<WorkspaceKey, WorkspaceNavigationConfig> = {
  candidate: {
    key: "candidate",
    role: "candidate",
    label: "Ứng viên",
    workspaceLabel: "Không gian ứng viên",
    basePath: "/candidate",
    homeHref: CANDIDATE_CANONICAL_ROUTES.overview,
    sidebarItems: [
      {
        id: "overview",
        label: "Tổng quan",
        href: CANDIDATE_CANONICAL_ROUTES.overview,
        icon: "dashboard",
      },
      {
        id: "profile",
        label: "Hồ sơ cá nhân",
        href: CANDIDATE_CANONICAL_ROUTES.profile,
        icon: "person",
      },
      {
        id: "cv",
        label: "CV của tôi",
        href: CANDIDATE_CANONICAL_ROUTES.cv,
        icon: "description",
      },
      {
        id: "jobs",
        label: "Việc của tôi",
        href: CANDIDATE_CANONICAL_ROUTES.jobs,
        icon: "work_history",
      },
      {
        id: "settings",
        label: "Cài đặt",
        href: CANDIDATE_CANONICAL_ROUTES.settings,
        icon: "settings",
      },
    ],
    accountMenuItems: [
      {
        id: "workspace",
        label: "Không gian ứng viên",
        href: CANDIDATE_CANONICAL_ROUTES.overview,
        icon: "dashboard",
      },
      {
        id: "profile",
        label: "Hồ sơ cá nhân",
        href: CANDIDATE_CANONICAL_ROUTES.profile,
        icon: "person",
      },
      {
        id: "cv",
        label: "CV của tôi",
        href: CANDIDATE_CANONICAL_ROUTES.cv,
        icon: "description",
      },
      {
        id: "jobs",
        label: "Việc đã ứng tuyển",
        href: CANDIDATE_CANONICAL_ROUTES.jobs,
        icon: "work_history",
      },
      {
        id: "settings",
        label: "Cài đặt",
        href: CANDIDATE_CANONICAL_ROUTES.settings,
        icon: "settings",
      },
    ],
    legacyPrefixes: [
      "/candidate/dashboard",
      "/candidate/cv-builder",
      "/candidate/templates",
      "/candidate/applications",
      "/candidate/jobs",
      "/candidate/settings",
    ],
  },
  hr: {
    key: "hr",
    role: "hr",
    label: "Nhà tuyển dụng",
    workspaceLabel: "Không gian tuyển dụng",
    basePath: "/hr",
    homeHref: HR_CANONICAL_ROUTES.overview,
    sidebarItems: [
      {
        id: "overview",
        label: "Tổng quan",
        href: HR_CANONICAL_ROUTES.overview,
        icon: "dashboard",
      },
      {
        id: "candidates",
        label: "Kho ứng viên",
        href: HR_CANONICAL_ROUTES.candidates,
        icon: "groups",
      },
      {
        id: "jobs",
        label: "Tin tuyển dụng",
        href: HR_CANONICAL_ROUTES.jobs,
        icon: "work",
      },
      {
        id: "company",
        label: "Hồ sơ công ty",
        href: HR_CANONICAL_ROUTES.company,
        icon: "apartment",
      },
      {
        id: "settings",
        label: "Cài đặt",
        href: HR_CANONICAL_ROUTES.settings,
        icon: "settings",
      },
    ],
    accountMenuItems: [
      {
        id: "workspace",
        label: "Không gian tuyển dụng",
        href: HR_CANONICAL_ROUTES.overview,
        icon: "dashboard",
      },
      {
        id: "candidates",
        label: "Kho ứng viên",
        href: HR_CANONICAL_ROUTES.candidates,
        icon: "groups",
      },
      {
        id: "jobs",
        label: "Tin tuyển dụng",
        href: HR_CANONICAL_ROUTES.jobs,
        icon: "work",
      },
      {
        id: "company",
        label: "Hồ sơ công ty",
        href: HR_CANONICAL_ROUTES.company,
        icon: "apartment",
      },
      {
        id: "settings",
        label: "Cài đặt",
        href: HR_CANONICAL_ROUTES.settings,
        icon: "settings",
      },
    ],
    legacyPrefixes: ["/hr/dashboard", "/hr/candidates", "/hr/jobs", "/hr/company", "/hr/settings", "/hr/calendar"],
  },
};

function normalizePathname(pathname: string | null | undefined) {
  const trimmed = pathname?.trim() || "/";

  if (trimmed.length > 1 && trimmed.endsWith("/")) {
    return trimmed.slice(0, -1);
  }

  return trimmed;
}

export function getWorkspaceNavigationByKey(key: WorkspaceKey) {
  return WORKSPACE_CONFIGS[key];
}

export function getWorkspaceKeyFromPathname(pathname: string | null | undefined): WorkspaceKey | null {
  const normalized = normalizePathname(pathname);

  for (const config of Object.values(WORKSPACE_CONFIGS)) {
    if (normalized === config.basePath || normalized.startsWith(`${config.basePath}/`)) {
      return config.key;
    }

    if (config.legacyPrefixes.some((prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`))) {
      return config.key;
    }
  }

  return null;
}

export function isAuthRoute(pathname: string | null | undefined) {
  const normalized = normalizePathname(pathname);
  return AUTH_ROUTE_PREFIXES.some((prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`));
}

export function isRoleSelectionRoute(pathname: string | null | undefined) {
  const normalized = normalizePathname(pathname);
  return ROLE_SELECTION_PATHS.some((prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`));
}

export function canAccessWorkspace(role: string | null | undefined, workspaceKey: WorkspaceKey) {
  const normalizedRole = String(role ?? "").trim();
  if (!normalizedRole) {
    return false;
  }

  return normalizedRole === WORKSPACE_CONFIGS[workspaceKey].role;
}

export function getWorkspaceHomeHref(role: string | null | undefined) {
  // TODO(multi-role): prefer the viewer's last active workspace or an explicit workspace picker.
  const normalizedRole = String(role ?? "").trim();

  if (normalizedRole === "candidate") {
    return WORKSPACE_CONFIGS.candidate.homeHref;
  }

  if (normalizedRole === "hr") {
    return WORKSPACE_CONFIGS.hr.homeHref;
  }

  return ROLE_SELECTION_PATHS[0];
}

export function getWorkspaceNavigationByRole(role: string | null | undefined) {
  // TODO(multi-role): return all accessible workspaces so the header can render a real workspace switcher.
  const normalizedRole = String(role ?? "").trim();
  if (normalizedRole === "candidate") {
    return WORKSPACE_CONFIGS.candidate;
  }

  if (normalizedRole === "hr") {
    return WORKSPACE_CONFIGS.hr;
  }

  return null;
}

export function isWorkspaceRoute(pathname: string | null | undefined) {
  return getWorkspaceKeyFromPathname(pathname) !== null;
}
