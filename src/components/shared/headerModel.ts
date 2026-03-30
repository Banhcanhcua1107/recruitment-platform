export interface HeaderViewer {
  id: string;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  role: string;
  companyName: string | null;
}

export interface HeaderNavItem {
  label: string;
  href: string;
}

export interface HeaderAccountMenuItem {
  id: string;
  label: string;
  href: string | null;
  icon: string;
  kind: "link" | "action";
  disabled?: boolean;
}

export interface HeaderAccountMenuModel {
  workspaceLabel: string;
  items: HeaderAccountMenuItem[];
}

export interface GlobalHeaderModel {
  primaryLinks: HeaderNavItem[];
  isAuthenticated: boolean;
  viewer: {
    id: string;
    role: string;
    fullName: string;
    displayName: string;
    avatarUrl: string | null;
  } | null;
  accountMenu: HeaderAccountMenuModel | null;
}

const PUBLIC_PRIMARY_LINKS: HeaderNavItem[] = [
  { label: "Trang chủ", href: "/" },
  { label: "Tìm việc làm", href: "/jobs" },
  { label: "Liên hệ", href: "/contact" },
];

const HR_PRIMARY_LINKS: HeaderNavItem[] = [
  { label: "Trang chủ", href: "/hr-home" },
  { label: "Không gian nhà tuyển dụng", href: "/hr/dashboard" },
  { label: "Thông báo", href: "/hr/notifications" },
];

function resolvePrimaryLinks(role: string) {
  return role === "hr" ? HR_PRIMARY_LINKS : PUBLIC_PRIMARY_LINKS;
}

function getDisplayName(fullName: string | null, email: string | null) {
  const trimmedName = typeof fullName === "string" ? fullName.trim() : "";
  if (trimmedName) {
    const parts = trimmedName.split(/\s+/).filter(Boolean);
    return parts.at(-1) ?? trimmedName;
  }

  const trimmedEmail = typeof email === "string" ? email.trim() : "";
  if (trimmedEmail) {
    return trimmedEmail.split("@")[0] || "Thành viên";
  }

  return "Thành viên";
}

function createCandidateMenu(): HeaderAccountMenuModel {
  return {
    workspaceLabel: "Không gian ứng viên",
    items: [
      {
        id: "candidate-workspace",
        label: "Không gian ứng viên",
        href: "/candidate/dashboard",
        icon: "dashboard",
        kind: "link",
      },
      {
        id: "candidate-profile",
        label: "Hồ sơ cá nhân",
        href: "/candidate/profile",
        icon: "person",
        kind: "link",
      },
      {
        id: "candidate-cv",
        label: "CV của tôi",
        href: "/candidate/cv-builder",
        icon: "description",
        kind: "link",
      },
      {
        id: "candidate-applications",
        label: "Việc đã ứng tuyển",
        href: "/candidate/jobs/applied",
        icon: "work_history",
        kind: "link",
      },
      {
        id: "candidate-settings",
        label: "Cài đặt",
        href: "/candidate/settings/notifications",
        icon: "settings",
        kind: "link",
      },
      {
        id: "sign-out",
        label: "Đăng xuất",
        href: null,
        icon: "logout",
        kind: "action",
      },
    ],
  };
}

function createHrMenu(): HeaderAccountMenuModel {
  return {
    workspaceLabel: "Không gian tuyển dụng",
    items: [
      {
        id: "hr-workspace",
        label: "Không gian tuyển dụng",
        href: "/hr/dashboard",
        icon: "dashboard",
        kind: "link",
      },
      {
        id: "hr-candidates",
        label: "Kho ứng viên",
        href: "/hr/candidates",
        icon: "groups",
        kind: "link",
      },
      {
        id: "hr-jobs",
        label: "Tin tuyển dụng",
        href: "/hr/jobs",
        icon: "work",
        kind: "link",
      },
      {
        id: "hr-company",
        label: "Hồ sơ công ty",
        href: "/hr/company",
        icon: "apartment",
        kind: "link",
      },
      {
        id: "hr-settings",
        label: "Cài đặt",
        href: "/hr/settings",
        icon: "settings",
        kind: "link",
      },
      {
        id: "sign-out",
        label: "Đăng xuất",
        href: null,
        icon: "logout",
        kind: "action",
      },
    ],
  };
}

function createFallbackMenu(role: string): HeaderAccountMenuModel {
  return {
    workspaceLabel: "Không gian của bạn",
    items: [
      {
        id: "role-selection",
        label: "Chọn không gian",
        href: "/role-selection",
        icon: "dashboard_customize",
        kind: "link",
      },
      {
        id: "settings",
        label: "Cài đặt",
        href: null,
        icon: "settings",
        kind: "link",
        disabled: true,
      },
      {
        id: "sign-out",
        label: role ? "Đăng xuất" : "Đăng xuất",
        href: null,
        icon: "logout",
        kind: "action",
      },
    ],
  };
}

function resolveAccountMenu(role: string) {
  // TODO(multi-role): switch from a single role menu to a workspace switcher backed by viewer memberships.
  switch (role) {
    case "candidate":
      return createCandidateMenu();
    case "hr":
      return createHrMenu();
    default:
      return createFallbackMenu(role);
  }
}

export function getGlobalHeaderModel(viewer: HeaderViewer | null): GlobalHeaderModel {
  if (!viewer) {
    return {
      primaryLinks: PUBLIC_PRIMARY_LINKS,
      isAuthenticated: false,
      viewer: null,
      accountMenu: null,
    };
  }

  const fullName = viewer.fullName?.trim() || "";
  const displayName = getDisplayName(viewer.fullName, viewer.email);

  return {
    primaryLinks: resolvePrimaryLinks(viewer.role || "GUEST"),
    isAuthenticated: true,
    viewer: {
      id: viewer.id,
      role: viewer.role || "GUEST",
      fullName: fullName || displayName,
      displayName,
      avatarUrl: viewer.avatarUrl,
    },
    accountMenu: resolveAccountMenu(viewer.role || "GUEST"),
  };
}
