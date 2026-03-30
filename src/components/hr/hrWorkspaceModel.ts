export interface HRWorkspaceBreadcrumb {
  label: string;
  href?: string;
}

export interface HRWorkspaceLinkItem {
  id: string;
  label: string;
  href: string;
  icon: string;
  isActive?: boolean;
}

export interface HRWorkspaceModel {
  pathname: string;
  useWorkspaceShell: boolean;
  showFooter: boolean;
  headerVariant: "full" | "compact";
  showTitleInHeader: boolean;
  title: string;
  description: string | null;
  breadcrumbs: HRWorkspaceBreadcrumb[];
  activeItemId: string | null;
  sidebarItems: HRWorkspaceLinkItem[];
}

type HRWorkspaceRouteConfig = {
  headerVariant?: "full" | "compact";
  showTitleInHeader?: boolean;
  title: string;
  description?: string | null;
  breadcrumbs: HRWorkspaceBreadcrumb[];
  activeItemId?: string | null;
  matches: (pathname: string) => boolean;
};

const WORKSPACE_HOME: HRWorkspaceBreadcrumb = {
  label: "Không gian tuyển dụng",
  href: "/hr/dashboard",
};

const SIDEBAR_ITEMS: HRWorkspaceLinkItem[] = [
  {
    id: "dashboard",
    label: "Tổng quan",
    href: "/hr/dashboard",
    icon: "dashboard",
  },
  {
    id: "candidates",
    label: "Kho ứng viên",
    href: "/hr/candidates",
    icon: "groups",
  },
  {
    id: "jobs",
    label: "Tin tuyển dụng",
    href: "/hr/jobs",
    icon: "work",
  },
  {
    id: "company",
    label: "Hồ sơ công ty",
    href: "/hr/company",
    icon: "apartment",
  },
  {
    id: "settings",
    label: "Cài đặt",
    href: "/hr/settings",
    icon: "settings",
  },
];

function normalizePathname(pathname: string | null | undefined) {
  const nextPathname = pathname?.trim() || "/hr/dashboard";

  if (nextPathname.length > 1 && nextPathname.endsWith("/")) {
    return nextPathname.slice(0, -1);
  }

  return nextPathname;
}

function isExact(pathname: string, href: string) {
  return pathname === href;
}

function matchesRegex(pathname: string, pattern: RegExp) {
  return pattern.test(pathname);
}

const ROUTES: HRWorkspaceRouteConfig[] = [
  {
    headerVariant: "compact",
    showTitleInHeader: false,
    title: "Tổng quan",
    description: "Điểm vào chính cho recruiter workspace.",
    breadcrumbs: [WORKSPACE_HOME, { label: "Tổng quan" }],
    activeItemId: "dashboard",
    matches: (pathname) => isExact(pathname, "/hr") || isExact(pathname, "/hr/dashboard"),
  },
  {
    headerVariant: "compact",
    showTitleInHeader: false,
    title: "Kho ứng viên",
    description: "Danh sách ứng viên trong ATS của nhà tuyển dụng.",
    breadcrumbs: [WORKSPACE_HOME, { label: "Kho ứng viên" }],
    activeItemId: "candidates",
    matches: (pathname) => isExact(pathname, "/hr/candidates"),
  },
  {
    headerVariant: "compact",
    showTitleInHeader: false,
    title: "Hồ sơ ứng viên",
    description: null,
    breadcrumbs: [
      WORKSPACE_HOME,
      { label: "Kho ứng viên", href: "/hr/candidates" },
      { label: "Hồ sơ ứng viên" },
    ],
    activeItemId: "candidates",
    matches: (pathname) => matchesRegex(pathname, /^\/hr\/candidates\/[^/]+$/),
  },
  {
    headerVariant: "compact",
    showTitleInHeader: false,
    title: "Tin tuyển dụng",
    description: "Quản lý danh sách tin tuyển dụng của doanh nghiệp.",
    breadcrumbs: [WORKSPACE_HOME, { label: "Tin tuyển dụng" }],
    activeItemId: "jobs",
    matches: (pathname) => isExact(pathname, "/hr/jobs"),
  },
  {
    headerVariant: "compact",
    showTitleInHeader: false,
    title: "Tạo tin tuyển dụng",
    description: null,
    breadcrumbs: [
      WORKSPACE_HOME,
      { label: "Tin tuyển dụng", href: "/hr/jobs" },
      { label: "Tạo tin tuyển dụng" },
    ],
    activeItemId: "jobs",
    matches: (pathname) => isExact(pathname, "/hr/jobs/create"),
  },
  {
    headerVariant: "compact",
    showTitleInHeader: false,
    title: "Chi tiết tin tuyển dụng",
    description: null,
    breadcrumbs: [
      WORKSPACE_HOME,
      { label: "Tin tuyển dụng", href: "/hr/jobs" },
      { label: "Chi tiết tin tuyển dụng" },
    ],
    activeItemId: "jobs",
    matches: (pathname) => matchesRegex(pathname, /^\/hr\/jobs\/[^/]+$/),
  },
  {
    headerVariant: "compact",
    showTitleInHeader: false,
    title: "Hồ sơ công ty",
    description: "Quản lý thông tin thương hiệu tuyển dụng.",
    breadcrumbs: [WORKSPACE_HOME, { label: "Hồ sơ công ty" }],
    activeItemId: "company",
    matches: (pathname) => isExact(pathname, "/hr/company"),
  },
  {
    headerVariant: "full",
    showTitleInHeader: true,
    title: "Cài đặt",
    description: "Quản lý các tùy chọn cơ bản cho recruiter workspace.",
    breadcrumbs: [WORKSPACE_HOME, { label: "Cài đặt" }],
    activeItemId: "settings",
    matches: (pathname) => isExact(pathname, "/hr/settings"),
  },
  {
    headerVariant: "compact",
    showTitleInHeader: false,
    title: "Lịch phỏng vấn",
    description: null,
    breadcrumbs: [WORKSPACE_HOME, { label: "Lịch phỏng vấn" }],
    activeItemId: null,
    matches: (pathname) => isExact(pathname, "/hr/calendar"),
  },
];

function getDefaultWorkspaceRoute(): HRWorkspaceRouteConfig {
  return {
    headerVariant: "compact",
    showTitleInHeader: false,
    title: "Không gian tuyển dụng",
    description: null,
    breadcrumbs: [WORKSPACE_HOME],
    activeItemId: null,
    matches: () => true,
  };
}

function cloneSidebarItems(activeItemId: string | null) {
  return SIDEBAR_ITEMS.map((item) => ({
    ...item,
    isActive: item.id === activeItemId,
  }));
}

export function getHrWorkspaceModel(pathname: string | null | undefined): HRWorkspaceModel {
  const nextPathname = normalizePathname(pathname);
  const route = ROUTES.find((item) => item.matches(nextPathname)) || getDefaultWorkspaceRoute();
  const activeItemId = route.activeItemId ?? null;

  return {
    pathname: nextPathname,
    useWorkspaceShell: true,
    showFooter: true,
    headerVariant: route.headerVariant ?? "compact",
    showTitleInHeader: route.showTitleInHeader ?? false,
    title: route.title,
    description: route.description ?? null,
    breadcrumbs: route.breadcrumbs,
    activeItemId,
    sidebarItems: cloneSidebarItems(activeItemId),
  };
}
