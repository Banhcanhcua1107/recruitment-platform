export interface CandidateWorkspaceBreadcrumb {
  label: string;
  href?: string;
}

export interface CandidateWorkspaceLinkItem {
  id: string;
  label: string;
  href: string;
  icon: string;
  isActive?: boolean;
}

export interface CandidateWorkspaceGroupItem {
  id: string;
  label: string;
  icon: string;
  href: string;
  children: CandidateWorkspaceLinkItem[];
  isActive?: boolean;
}

export interface CandidateWorkspaceModel {
  pathname: string;
  useWorkspaceShell: boolean;
  showFooter: boolean;
  headerVariant: "full" | "compact";
  showTitleInHeader: boolean;
  title: string;
  description: string | null;
  breadcrumbs: CandidateWorkspaceBreadcrumb[];
  activeItemId: string | null;
  activeGroupId: string | null;
  sidebarItems: Array<CandidateWorkspaceLinkItem | CandidateWorkspaceGroupItem>;
}

type CandidateWorkspaceRouteConfig = {
  kind: "shell" | "immersive";
  headerVariant?: "full" | "compact";
  showTitleInHeader?: boolean;
  title: string;
  description?: string | null;
  breadcrumbs: CandidateWorkspaceBreadcrumb[];
  activeItemId?: string | null;
  activeGroupId?: string | null;
  matches: (pathname: string) => boolean;
};

const WORKSPACE_HOME: CandidateWorkspaceBreadcrumb = {
  label: "Không gian ứng viên",
  href: "/candidate/dashboard",
};

function createLinkItem(
  id: string,
  label: string,
  href: string,
  icon: string
): CandidateWorkspaceLinkItem {
  return { id, label, href, icon };
}

const SIDEBAR_ITEMS: Array<CandidateWorkspaceLinkItem | CandidateWorkspaceGroupItem> = [
  createLinkItem("dashboard", "Tổng quan", "/candidate/dashboard", "dashboard"),
  createLinkItem("profile", "Hồ sơ cá nhân", "/candidate/profile", "person"),
  createLinkItem("cv", "CV của tôi", "/candidate/cv-builder", "description"),
  {
    id: "jobs",
    label: "Việc của tôi",
    icon: "work_history",
    href: "/candidate/jobs/applied",
    children: [
      createLinkItem("jobs-applied", "Việc đã ứng tuyển", "/candidate/jobs/applied", "task"),
      createLinkItem("jobs-saved", "Việc đã lưu", "/candidate/jobs/saved", "bookmark"),
      createLinkItem("jobs-recommended", "Việc phù hợp", "/candidate/jobs/recommended", "auto_awesome"),
    ],
  },
  {
    id: "settings",
    label: "Cài đặt",
    icon: "settings",
    href: "/candidate/settings/notifications",
    children: [
      createLinkItem(
        "settings-notifications",
        "Thông báo",
        "/candidate/settings/notifications",
        "notifications"
      ),
      createLinkItem("settings-security", "Bảo mật", "/candidate/settings/security", "shield_lock"),
    ],
  },
];

function normalizePathname(pathname: string | null | undefined) {
  const nextPathname = pathname?.trim() || "/candidate/dashboard";

  if (nextPathname.length > 1 && nextPathname.endsWith("/")) {
    return nextPathname.slice(0, -1);
  }

  return nextPathname;
}

function isExact(pathname: string, href: string) {
  return pathname === href;
}

function isPrefix(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function matchesRegex(pathname: string, pattern: RegExp) {
  return pattern.test(pathname);
}

const ROUTES: CandidateWorkspaceRouteConfig[] = [
  {
    kind: "immersive",
    title: "Trình chỉnh sửa CV",
    breadcrumbs: [WORKSPACE_HOME, { label: "CV của tôi", href: "/candidate/cv-builder" }],
    activeItemId: "cv",
    matches: (pathname) =>
      isExact(pathname, "/candidate/cv-builder/new") ||
      matchesRegex(pathname, /^\/candidate\/cv-builder\/[^/]+\/edit$/) ||
      matchesRegex(pathname, /^\/candidate\/cv-builder\/editable\/[^/]+$/) ||
      matchesRegex(pathname, /^\/candidate\/cv-builder\/imports\/[^/]+$/),
  },
  {
    kind: "shell",
    headerVariant: "full",
    showTitleInHeader: true,
    title: "Tổng quan",
    description: "Theo dõi hồ sơ, CV và hoạt động ứng tuyển gần đây trong một nơi.",
    breadcrumbs: [WORKSPACE_HOME, { label: "Tổng quan" }],
    activeItemId: "dashboard",
    matches: (pathname) => isExact(pathname, "/candidate") || isExact(pathname, "/candidate/dashboard"),
  },
  {
    kind: "shell",
    headerVariant: "full",
    showTitleInHeader: true,
    title: "Hồ sơ cá nhân",
    description: "Cập nhật thông tin cá nhân và độ hoàn thiện hồ sơ để nổi bật hơn.",
    breadcrumbs: [WORKSPACE_HOME, { label: "Hồ sơ cá nhân" }],
    activeItemId: "profile",
    matches: (pathname) => isPrefix(pathname, "/candidate/profile"),
  },
  {
    kind: "shell",
    headerVariant: "compact",
    showTitleInHeader: false,
    title: "CV của tôi",
    description: "Quản lý, tạo mới và chỉnh sửa các CV đã lưu.",
    breadcrumbs: [WORKSPACE_HOME, { label: "CV của tôi" }],
    activeItemId: "cv",
    matches: (pathname) => isExact(pathname, "/candidate/cv-builder"),
  },
  {
    kind: "shell",
    headerVariant: "compact",
    showTitleInHeader: false,
    title: "CV của tôi",
    description: "Chọn mẫu CV và tiếp tục luồng tạo hồ sơ.",
    breadcrumbs: [
      WORKSPACE_HOME,
      { label: "CV của tôi", href: "/candidate/cv-builder" },
      { label: "Mẫu CV" },
    ],
    activeItemId: "cv",
    matches: (pathname) => isPrefix(pathname, "/candidate/templates"),
  },
  {
    kind: "shell",
    headerVariant: "compact",
    showTitleInHeader: false,
    title: "Việc đã ứng tuyển",
    description: "Theo dõi tiến độ những đơn bạn đã nộp.",
    breadcrumbs: [
      WORKSPACE_HOME,
      { label: "Việc của tôi", href: "/candidate/jobs/applied" },
      { label: "Việc đã ứng tuyển" },
    ],
    activeGroupId: "jobs",
    activeItemId: "jobs-applied",
    matches: (pathname) =>
      isExact(pathname, "/candidate/applications") ||
      isExact(pathname, "/candidate/jobs") ||
      isExact(pathname, "/candidate/jobs/applied"),
  },
  {
    kind: "shell",
    headerVariant: "compact",
    showTitleInHeader: false,
    title: "Chi tiết ứng tuyển",
    description: null,
    breadcrumbs: [
      WORKSPACE_HOME,
      { label: "Việc của tôi", href: "/candidate/jobs/applied" },
      { label: "Việc đã ứng tuyển", href: "/candidate/jobs/applied" },
      { label: "Chi tiết ứng tuyển" },
    ],
    activeGroupId: "jobs",
    activeItemId: "jobs-applied",
    matches: (pathname) => matchesRegex(pathname, /^\/candidate\/applications\/[^/]+$/),
  },
  {
    kind: "shell",
    headerVariant: "full",
    showTitleInHeader: true,
    title: "Việc đã lưu",
    description: "Xem lại các tin tuyển dụng bạn đã đánh dấu để quay lại sau.",
    breadcrumbs: [
      WORKSPACE_HOME,
      { label: "Việc của tôi", href: "/candidate/jobs/applied" },
      { label: "Việc đã lưu" },
    ],
    activeGroupId: "jobs",
    activeItemId: "jobs-saved",
    matches: (pathname) => isExact(pathname, "/candidate/jobs/saved"),
  },
  {
    kind: "shell",
    headerVariant: "full",
    showTitleInHeader: true,
    title: "Việc phù hợp",
    description: "Tập trung các gợi ý việc làm cá nhân hóa và danh sách dự phòng mới nhất.",
    breadcrumbs: [
      WORKSPACE_HOME,
      { label: "Việc của tôi", href: "/candidate/jobs/applied" },
      { label: "Việc phù hợp" },
    ],
    activeGroupId: "jobs",
    activeItemId: "jobs-recommended",
    matches: (pathname) => isExact(pathname, "/candidate/jobs/recommended"),
  },
  {
    kind: "shell",
    headerVariant: "full",
    showTitleInHeader: true,
    title: "Thông báo",
    description: "Quản lý các loại thông báo quan trọng cho hành trình ứng tuyển của bạn.",
    breadcrumbs: [
      WORKSPACE_HOME,
      { label: "Cài đặt", href: "/candidate/settings/notifications" },
      { label: "Thông báo" },
    ],
    activeGroupId: "settings",
    activeItemId: "settings-notifications",
    matches: (pathname) =>
      isExact(pathname, "/candidate/settings") ||
      isExact(pathname, "/candidate/settings/notifications"),
  },
  {
    kind: "shell",
    headerVariant: "full",
    showTitleInHeader: true,
    title: "Bảo mật",
    description: "Kiểm tra thông tin đăng nhập và các bước giúp tài khoản an toàn hơn.",
    breadcrumbs: [
      WORKSPACE_HOME,
      { label: "Cài đặt", href: "/candidate/settings/notifications" },
      { label: "Bảo mật" },
    ],
    activeGroupId: "settings",
    activeItemId: "settings-security",
    matches: (pathname) => isExact(pathname, "/candidate/settings/security"),
  },
  {
    kind: "immersive",
    title: "Hồ sơ ứng viên",
    breadcrumbs: [WORKSPACE_HOME, { label: "Hồ sơ ứng viên công khai" }],
    matches: (pathname) => matchesRegex(pathname, /^\/candidate\/[^/]+$/),
  },
];

function getDefaultWorkspaceModel(): CandidateWorkspaceRouteConfig {
  return {
    kind: "shell",
    headerVariant: "compact",
    showTitleInHeader: true,
    title: "Không gian ứng viên",
    description: null,
    breadcrumbs: [WORKSPACE_HOME],
    matches: () => true,
  };
}

function cloneSidebarItems(
  activeItemId: string | null,
  activeGroupId: string | null
): Array<CandidateWorkspaceLinkItem | CandidateWorkspaceGroupItem> {
  return SIDEBAR_ITEMS.map((item) => {
    if ("children" in item) {
      return {
        ...item,
        isActive: item.id === activeGroupId,
        children: item.children.map((child) => ({
          ...child,
          isActive: child.id === activeItemId,
        })),
      };
    }

    return {
      ...item,
      isActive: item.id === activeItemId,
    };
  });
}

export function getCandidateWorkspaceModel(pathname: string | null | undefined): CandidateWorkspaceModel {
  const nextPathname = normalizePathname(pathname);
  const route = ROUTES.find((candidateRoute) => candidateRoute.matches(nextPathname)) || getDefaultWorkspaceModel();
  const activeItemId = route.activeItemId ?? null;
  const activeGroupId = route.activeGroupId ?? null;

  return {
    pathname: nextPathname,
    useWorkspaceShell: route.kind === "shell",
    showFooter: route.kind === "shell",
    headerVariant: route.headerVariant ?? "compact",
    showTitleInHeader: route.showTitleInHeader ?? route.headerVariant !== "compact",
    title: route.title,
    description: route.description ?? null,
    breadcrumbs: route.breadcrumbs,
    activeItemId,
    activeGroupId,
    sidebarItems: cloneSidebarItems(activeItemId, activeGroupId),
  };
}
