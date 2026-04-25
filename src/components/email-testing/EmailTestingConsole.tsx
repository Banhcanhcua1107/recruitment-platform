"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  EmailMode,
  EmailTemplateKind,
  FakeAccount,
  FakeAccountRole,
  TestInboxMessage,
} from "@/types/email-testing";
import { useAppDialog } from "@/components/ui/app-dialog";

type ConsoleTab = "accounts" | "inbox";

interface EmailTestingConsoleProps {
  emailMode: EmailMode;
  mailpitWebUrl: string;
  initialTab: ConsoleTab;
}

interface ActionState {
  loading: boolean;
  error: string;
  success: string;
}

interface AccountStats {
  total: number;
  candidate: number;
  recruiter: number;
  filtered: number;
}

type RoleFilter = "all" | FakeAccountRole;

interface AccountApiResponse {
  items?: FakeAccount[];
  stats?: Partial<AccountStats>;
  error?: string;
}

interface SyncRecruitmentSummary {
  requestedAccounts?: number;
  processedAccounts?: number;
  publicCandidateTestAccounts?: number;
  authUsers?: {
    created?: number;
    existing?: number;
  };
  synced?: {
    candidateProfiles?: number;
  };
  failed?: Array<{
    email: string;
    reason: string;
  }>;
}

function createActionState(): ActionState {
  return { loading: false, error: "", success: "" };
}

function createStatsState(): AccountStats {
  return {
    total: 0,
    candidate: 0,
    recruiter: 0,
    filtered: 0,
  };
}

function formatDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }

  return date.toLocaleString();
}

function templateLabel(value: EmailTemplateKind) {
  switch (value) {
    case "otp":
      return "OTP";
    case "verification":
      return "Xac minh";
    case "password-reset":
      return "Dat lai mat khau";
    case "apply-job":
      return "Ung tuyen";
    case "notification":
      return "Thong bao";
    case "custom":
      return "Tuy chinh";
    default:
      return value;
  }
}

function roleLabel(value: FakeAccountRole) {
  return value === "candidate" ? "Ung vien" : "Nha tuyen dung";
}

export default function EmailTestingConsole({
  emailMode,
  mailpitWebUrl,
  initialTab,
}: EmailTestingConsoleProps) {
  const { confirm } = useAppDialog();
  const [activeTab, setActiveTab] = useState<ConsoleTab>(initialTab);
  const [accounts, setAccounts] = useState<FakeAccount[]>([]);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [accountStats, setAccountStats] = useState<AccountStats>(createStatsState());
  const [seedCandidateCount, setSeedCandidateCount] = useState(40);
  const [seedRecruiterCount, setSeedRecruiterCount] = useState(20);
  const [createCount, setCreateCount] = useState(5);
  const [createRole, setCreateRole] = useState<FakeAccountRole>("candidate");
  const [fromEmail, setFromEmail] = useState("");
  const [toEmail, setToEmail] = useState("");
  const [inboxEmail, setInboxEmail] = useState("");
  const [template, setTemplate] = useState<EmailTemplateKind>("otp");
  const [customSubject, setCustomSubject] = useState("Cap nhat trang thai ung tuyen");
  const [customText, setCustomText] = useState(
    "Ho so cua ban da duoc chuyen sang buoc tiep theo trong quy trinh.",
  );
  const [jobTitle, setJobTitle] = useState("Lap trinh vien Frontend");
  const [companyName, setCompanyName] = useState("TalentFlow");
  const [messages, setMessages] = useState<TestInboxMessage[]>([]);
  const [expandedMessageId, setExpandedMessageId] = useState<string | null>(null);
  const [accountsState, setAccountsState] = useState<ActionState>(createActionState());
  const [sendState, setSendState] = useState<ActionState>(createActionState());
  const [inboxState, setInboxState] = useState<ActionState>(createActionState());

  const canSend = Boolean(fromEmail && toEmail);

  const accountEmails = useMemo(() => accounts.map((item) => item.email), [accounts]);

  const visibleAccounts = useMemo(() => {
    if (roleFilter === "all") {
      return accounts;
    }

    return accounts.filter((account) => account.role === roleFilter);
  }, [accounts, roleFilter]);

  const effectiveStats = useMemo(
    () => ({
      ...accountStats,
      filtered: visibleAccounts.length,
    }),
    [accountStats, visibleAccounts.length],
  );

  const loadAccountDataset = useCallback(async () => {
    const response = await fetch("/api/fake-accounts", { cache: "no-store" });
    const data = (await response.json()) as AccountApiResponse;

    if (!response.ok) {
      throw new Error(data.error || "Khong the tai danh sach tai khoan test.");
    }

    const items = data.items || [];
    const stats = data.stats || {};

    setAccounts(items);
    setAccountStats({
      total: stats.total ?? items.length,
      candidate: stats.candidate ?? items.filter((account) => account.role === "candidate").length,
      recruiter: stats.recruiter ?? items.filter((account) => account.role === "recruiter").length,
      filtered: stats.filtered ?? items.length,
    });

    const firstCandidate = items.find((item) => item.role === "candidate")?.email || "";
    const firstRecruiter = items.find((item) => item.role === "recruiter")?.email || "";
    const fallbackEmail = items[0]?.email || "";
    const emailSet = new Set(items.map((item) => item.email));

    setFromEmail((prev) => (emailSet.has(prev) ? prev : firstCandidate || fallbackEmail));
    setToEmail((prev) => (emailSet.has(prev) ? prev : firstRecruiter || fallbackEmail));
    setInboxEmail((prev) => (emailSet.has(prev) ? prev : firstCandidate || fallbackEmail));

    return items.length;
  }, []);

  const fetchAccounts = useCallback(async () => {
    setAccountsState((prev) => ({ ...prev, loading: true, error: "", success: "" }));

    try {
      const total = await loadAccountDataset();

      setAccountsState((prev) => ({
        ...prev,
        loading: false,
        success: `Da tai ${total} tai khoan test.`,
      }));
    } catch (error) {
      setAccountsState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : "Da xay ra loi khong xac dinh.",
      }));
    }
  }, [loadAccountDataset]);

  async function seedDefaultAccounts() {
    setAccountsState((prev) => ({ ...prev, loading: true, error: "", success: "" }));

    try {
      const response = await fetch("/api/fake-accounts/seed", {
        method: "POST",
      });
      const data = (await response.json()) as {
        success?: boolean;
        created?: { candidate?: number; recruiter?: number };
        skipped?: { candidate?: number; recruiter?: number };
        error?: string;
      };

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Khong the tao bo tai khoan mac dinh.");
      }

      await loadAccountDataset();
      setAccountsState((prev) => ({
        ...prev,
        loading: false,
        success:
          `Da seed xong. Tao moi ung vien: ${data.created?.candidate || 0}, nha tuyen dung: ${data.created?.recruiter || 0}. ` +
          `Bo qua ung vien: ${data.skipped?.candidate || 0}, nha tuyen dung: ${data.skipped?.recruiter || 0}.`,
      }));
    } catch (error) {
      setAccountsState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : "Da xay ra loi khong xac dinh.",
      }));
    }
  }

  async function seedCustomAccounts() {
    setAccountsState((prev) => ({ ...prev, loading: true, error: "", success: "" }));

    try {
      const response = await fetch("/api/fake-accounts/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateCount: seedCandidateCount,
          recruiterCount: seedRecruiterCount,
        }),
      });
      const data = (await response.json()) as {
        success?: boolean;
        created?: { candidate?: number; recruiter?: number };
        skipped?: { candidate?: number; recruiter?: number };
        error?: string;
      };

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Khong the seed theo so luong tuy chinh.");
      }

      await loadAccountDataset();
      setAccountsState((prev) => ({
        ...prev,
        loading: false,
        success:
          `Da seed tuy chinh. Tao moi ung vien: ${data.created?.candidate || 0}, nha tuyen dung: ${data.created?.recruiter || 0}. ` +
          `Bo qua ung vien: ${data.skipped?.candidate || 0}, nha tuyen dung: ${data.skipped?.recruiter || 0}.`,
      }));
    } catch (error) {
      setAccountsState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : "Da xay ra loi khong xac dinh.",
      }));
    }
  }

  async function syncAccountsToRecruitmentDirectory() {
    setAccountsState((prev) => ({ ...prev, loading: true, error: "", success: "" }));

    try {
      const response = await fetch("/api/fake-accounts/sync-recruitment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "all",
          seedIfEmpty: true,
          candidateCount: seedCandidateCount,
          recruiterCount: seedRecruiterCount,
        }),
      });
      const data = (await response.json()) as {
        success?: boolean;
        summary?: SyncRecruitmentSummary;
        error?: string;
      };

      if (!response.ok || !data.success || !data.summary) {
        throw new Error(data.error || "Khong the dong bo tai khoan vao he thong web.");
      }

      const summary = data.summary;
      const failedCount = summary.failed?.length || 0;
      await loadAccountDataset();

      setAccountsState((prev) => ({
        ...prev,
        loading: false,
        success:
          `Dong bo xong ${summary.processedAccounts || 0}/${summary.requestedAccounts || 0} tai khoan. ` +
          `Auth moi: ${summary.authUsers?.created || 0}, auth ton tai: ${summary.authUsers?.existing || 0}, ` +
          `candidate profile public .test: ${summary.publicCandidateTestAccounts || 0}.` +
          (failedCount > 0 ? ` Loi dong bo: ${failedCount} tai khoan.` : "") +
          " Mo /hr-home de kiem tra danh sach ung vien.",
      }));
    } catch (error) {
      setAccountsState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : "Da xay ra loi khong xac dinh.",
      }));
    }
  }

  async function createAccounts() {
    setAccountsState((prev) => ({ ...prev, loading: true, error: "", success: "" }));

    try {
      const response = await fetch("/api/fake-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          count: createCount,
          role: createRole,
        }),
      });
      const data = (await response.json()) as {
        created?: FakeAccount[];
        items?: FakeAccount[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || "Khong the tao tai khoan ngau nhien.");
      }

      await loadAccountDataset();

      setAccountsState((prev) => ({
        ...prev,
        loading: false,
        success: `Da tao ${data.created?.length || 0} tai khoan ngau nhien vai tro ${roleLabel(createRole).toLowerCase()}.`,
      }));
    } catch (error) {
      setAccountsState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : "Da xay ra loi khong xac dinh.",
      }));
    }
  }

  async function deleteAccount(id: string) {
    setAccountsState((prev) => ({ ...prev, loading: true, error: "", success: "" }));

    try {
      const response = await fetch("/api/fake-accounts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Khong the xoa tai khoan test.");
      }

      await loadAccountDataset();
      setAccountsState((prev) => ({
        ...prev,
        loading: false,
        success: "Da xoa tai khoan.",
      }));
    } catch (error) {
      setAccountsState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : "Da xay ra loi khong xac dinh.",
      }));
    }
  }

  async function deleteAllAccounts() {
    const confirmDelete = await confirm({
      title: "Xóa toàn bộ tài khoản test",
      description: "Ban co chac chan muon xoa toan bo tai khoan test? Hanh dong nay khong the hoan tac.",
      confirmText: "Xóa tất cả",
      cancelText: "Hủy",
      tone: "danger",
    });

    if (!confirmDelete) {
      return;
    }

    setAccountsState((prev) => ({ ...prev, loading: true, error: "", success: "" }));

    try {
      const response = await fetch("/api/fake-accounts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deleteAll: true }),
      });
      const data = (await response.json()) as { ok?: boolean; deletedCount?: number; error?: string };

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Khong the xoa toan bo tai khoan test.");
      }

      await loadAccountDataset();
      setAccountsState((prev) => ({
        ...prev,
        loading: false,
        success: `Da xoa ${data.deletedCount || 0} tai khoan.`,
      }));
    } catch (error) {
      setAccountsState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : "Da xay ra loi khong xac dinh.",
      }));
    }
  }

  async function sendEmail(templateToSend: EmailTemplateKind) {
    if (!canSend) {
      setSendState((prev) => ({
        ...prev,
        error: "Vui long chon nguoi gui va nguoi nhan truoc.",
      }));
      return;
    }

    setSendState((prev) => ({ ...prev, loading: true, error: "", success: "" }));

    const payload: Record<string, unknown> = {
      from: fromEmail,
      to: toEmail,
      template: templateToSend,
      data: {
        jobTitle,
        companyName,
        notificationTitle: customSubject,
        notificationMessage: customText,
      },
    };

    if (templateToSend === "custom") {
      payload.subject = customSubject;
      payload.text = customText;
    }

    try {
      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as {
        ok?: boolean;
        messageId?: string;
        error?: string;
      };

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Khong the gui email test.");
      }

      setSendState((prev) => ({
        ...prev,
        loading: false,
        success: `Da dua email vao hang doi gui. Message ID: ${data.messageId}`,
      }));

      if (inboxEmail) {
        void loadInbox(inboxEmail);
      }
    } catch (error) {
      setSendState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : "Da xay ra loi khong xac dinh.",
      }));
    }
  }

  async function loadInbox(email: string) {
    if (!email) {
      return;
    }

    setInboxState((prev) => ({ ...prev, loading: true, error: "", success: "" }));

    try {
      const response = await fetch(
        `/api/test-inbox?email=${encodeURIComponent(email)}&limit=20`,
        { cache: "no-store" },
      );
      const data = (await response.json()) as {
        items?: TestInboxMessage[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || "Khong the tai noi dung hop thu.");
      }

      const items = data.items || [];
      setMessages(items);
      setExpandedMessageId(items[0]?.id || null);

      setInboxState((prev) => ({
        ...prev,
        loading: false,
        success: `Da tai ${items.length} email cho ${email}.`,
      }));
    } catch (error) {
      setInboxState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : "Da xay ra loi khong xac dinh.",
      }));
    }
  }

  useEffect(() => {
    void fetchAccounts();
  }, [fetchAccounts]);

  useEffect(() => {
    if (!inboxEmail && accountEmails[0]) {
      setInboxEmail(accountEmails[0]);
    }
  }, [accountEmails, inboxEmail]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#ecfeff_0%,#f8fafc_35%,#f8fafc_100%)] px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-3xl border border-teal-100 bg-white/90 p-6 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.45)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
                Khu vuc kiem thu Mailpit
              </p>
              <h1 className="mt-2 text-3xl font-bold text-slate-900">Bang dieu khien Email Test</h1>
              <p className="mt-2 text-sm text-slate-600">
                Che do hien tai: <span className="font-semibold text-slate-900">{emailMode.toUpperCase()}</span>
                {emailMode === "test"
                  ? " (chi gui trong hop thu local an toan)"
                  : " (da bat luong SMTP that)"}
              </p>
            </div>
            <a
              href={mailpitWebUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center rounded-xl border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-700 transition hover:bg-teal-100"
            >
              Mo Mailpit UI
            </a>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTab("accounts")}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                activeTab === "accounts"
                  ? "bg-slate-900 text-white"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              Quan ly tai khoan
            </button>
            <button
              onClick={() => setActiveTab("inbox")}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                activeTab === "inbox"
                  ? "bg-slate-900 text-white"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              Xem hop thu
            </button>
          </div>
        </header>

        {activeTab === "accounts" && (
          <section className="grid gap-6 lg:grid-cols-2">
            <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900">Kho tai khoan ao tuyen dung</h2>
              <p className="mt-2 text-sm text-slate-600">
                Tao danh sach tai khoan Gmail ao theo vai tro ung vien va nha tuyen dung de test luong email nhieu nguoi dung.
              </p>

              <div className="mt-5 grid gap-2 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Tong so</p>
                  <p className="mt-1 text-xl font-bold text-slate-900">{effectiveStats.total}</p>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                  <p className="text-xs font-medium uppercase tracking-wider text-emerald-700">Ung vien</p>
                  <p className="mt-1 text-xl font-bold text-emerald-900">{effectiveStats.candidate}</p>
                </div>
                <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3">
                  <p className="text-xs font-medium uppercase tracking-wider text-indigo-700">Nha tuyen dung</p>
                  <p className="mt-1 text-xl font-bold text-indigo-900">{effectiveStats.recruiter}</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-end gap-3">
                <label className="flex flex-col text-sm text-slate-700">
                  Loc theo vai tro
                  <select
                    value={roleFilter}
                    onChange={(event) => setRoleFilter(event.target.value as RoleFilter)}
                    className="mt-1 rounded-xl border border-slate-300 px-3 py-2 outline-none ring-teal-300 focus:ring"
                  >
                    <option value="all">Tat ca vai tro</option>
                    <option value="candidate">Chi ung vien</option>
                    <option value="recruiter">Chi nha tuyen dung</option>
                  </select>
                </label>

                <button
                  onClick={fetchAccounts}
                  disabled={accountsState.loading}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  Tai lai
                </button>
              </div>

              <div className="mt-5 flex flex-wrap items-end gap-3">
                <button
                  onClick={seedDefaultAccounts}
                  disabled={accountsState.loading}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                >
                  Tao san 40 Ung vien + 20 Nha tuyen dung
                </button>

                <button
                  onClick={syncAccountsToRecruitmentDirectory}
                  disabled={accountsState.loading}
                  className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-700 transition hover:bg-teal-100 disabled:opacity-60"
                >
                  Dong bo thanh tai khoan that tren web
                </button>

                <button
                  onClick={deleteAllAccounts}
                  disabled={accountsState.loading || effectiveStats.total === 0}
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-60"
                >
                  Xoa toan bo tai khoan
                </button>
              </div>

              <p className="mt-2 text-xs text-slate-500">
                Sau khi dong bo, ung vien .test se duoc tao trong he thong va hien thi o trang /hr-home nhu nguoi dang ky that.
              </p>

              <div className="mt-4 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-3">
                <label className="flex flex-col text-sm text-slate-700">
                  So luong ung vien
                  <input
                    type="number"
                    min={0}
                    max={500}
                    value={seedCandidateCount}
                    onChange={(event) => setSeedCandidateCount(Number(event.target.value || 0))}
                    className="mt-1 rounded-xl border border-slate-300 px-3 py-2 outline-none ring-teal-300 focus:ring"
                  />
                </label>

                <label className="flex flex-col text-sm text-slate-700">
                  So luong nha tuyen dung
                  <input
                    type="number"
                    min={0}
                    max={500}
                    value={seedRecruiterCount}
                    onChange={(event) => setSeedRecruiterCount(Number(event.target.value || 0))}
                    className="mt-1 rounded-xl border border-slate-300 px-3 py-2 outline-none ring-teal-300 focus:ring"
                  />
                </label>

                <button
                  onClick={seedCustomAccounts}
                  disabled={accountsState.loading}
                  className="self-end rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-100 disabled:opacity-60"
                >
                  Tao theo so luong tuy chinh
                </button>
              </div>

              <div className="mt-4 grid gap-3 rounded-2xl border border-slate-200 p-4 sm:grid-cols-3">
                <p className="sm:col-span-3 text-sm font-semibold text-slate-800">
                  Tao them tai khoan ngau nhien (tuy chon)
                </p>

                <label className="flex flex-col text-sm text-slate-700">
                  So luong can tao
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={createCount}
                    onChange={(event) => setCreateCount(Number(event.target.value || 1))}
                    className="mt-1 w-28 rounded-xl border border-slate-300 px-3 py-2 outline-none ring-teal-300 focus:ring"
                  />
                </label>

                <label className="flex flex-col text-sm text-slate-700">
                  Vai tro ngau nhien
                  <select
                    value={createRole}
                    onChange={(event) => setCreateRole(event.target.value as FakeAccountRole)}
                    className="mt-1 rounded-xl border border-slate-300 px-3 py-2 outline-none ring-teal-300 focus:ring"
                  >
                    <option value="candidate">Ung vien</option>
                    <option value="recruiter">Nha tuyen dung</option>
                  </select>
                </label>

                <button
                  onClick={createAccounts}
                  disabled={accountsState.loading}
                  className="self-end rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-100 disabled:opacity-60"
                >
                  Tao tai khoan ngau nhien
                </button>
              </div>

              {accountsState.error ? (
                <p className="mt-3 text-sm text-red-600">{accountsState.error}</p>
              ) : null}
              {accountsState.success ? (
                <p className="mt-3 text-sm text-emerald-700">{accountsState.success}</p>
              ) : null}

              <div className="mt-5 max-h-80 space-y-2 overflow-auto pr-1">
                {visibleAccounts.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                    Khong co tai khoan phu hop bo loc hien tai.
                  </p>
                ) : (
                  visibleAccounts.map((account) => (
                    <div
                      key={account.id}
                      className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{account.email}</p>
                        <p className="text-xs text-slate-600">{account.displayName}</p>
                        <p className="text-xs text-slate-500">{formatDate(account.createdAt)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                            account.role === "candidate"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-indigo-100 text-indigo-700"
                          }`}
                        >
                          {roleLabel(account.role)}
                        </span>
                      <button
                        onClick={() => deleteAccount(account.id)}
                        className="rounded-lg border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                      >
                        Xoa
                      </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </article>

            <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900">Mo phong luong gui email</h2>
              <p className="mt-2 text-sm text-slate-600">
                Gui email giua cac tai khoan ao. Che do TEST tu dong chan dia chi khong phai .test.
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col text-sm text-slate-700">
                  Nguoi gui
                  <select
                    value={fromEmail}
                    onChange={(event) => setFromEmail(event.target.value)}
                    className="mt-1 rounded-xl border border-slate-300 px-3 py-2 outline-none ring-teal-300 focus:ring"
                  >
                    <option value="">Chon nguoi gui</option>
                    {accounts.map((account) => (
                      <option key={account.email} value={account.email}>
                        {account.email} - {account.displayName} ({roleLabel(account.role)})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col text-sm text-slate-700">
                  Nguoi nhan
                  <select
                    value={toEmail}
                    onChange={(event) => setToEmail(event.target.value)}
                    className="mt-1 rounded-xl border border-slate-300 px-3 py-2 outline-none ring-teal-300 focus:ring"
                  >
                    <option value="">Chon nguoi nhan</option>
                    {accounts.map((account) => (
                      <option key={account.email} value={account.email}>
                        {account.email} - {account.displayName} ({roleLabel(account.role)})
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col text-sm text-slate-700">
                  Vi tri
                  <input
                    value={jobTitle}
                    onChange={(event) => setJobTitle(event.target.value)}
                    className="mt-1 rounded-xl border border-slate-300 px-3 py-2 outline-none ring-teal-300 focus:ring"
                  />
                </label>

                <label className="flex flex-col text-sm text-slate-700">
                  Cong ty
                  <input
                    value={companyName}
                    onChange={(event) => setCompanyName(event.target.value)}
                    className="mt-1 rounded-xl border border-slate-300 px-3 py-2 outline-none ring-teal-300 focus:ring"
                  />
                </label>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col text-sm text-slate-700">
                  Tieu de tuy chinh
                  <input
                    value={customSubject}
                    onChange={(event) => setCustomSubject(event.target.value)}
                    className="mt-1 rounded-xl border border-slate-300 px-3 py-2 outline-none ring-teal-300 focus:ring"
                  />
                </label>

                <label className="flex flex-col text-sm text-slate-700 sm:col-span-2">
                  Noi dung tuy chinh
                  <textarea
                    value={customText}
                    onChange={(event) => setCustomText(event.target.value)}
                    rows={3}
                    className="mt-1 rounded-xl border border-slate-300 px-3 py-2 outline-none ring-teal-300 focus:ring"
                  />
                </label>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                {([
                  "otp",
                  "verification",
                  "password-reset",
                  "apply-job",
                  "notification",
                  "custom",
                ] as EmailTemplateKind[]).map((item) => (
                  <button
                    key={item}
                    onClick={() => {
                      setTemplate(item);
                      void sendEmail(item);
                    }}
                    disabled={sendState.loading || !canSend}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    Gui {templateLabel(item)}
                  </button>
                ))}
              </div>

              <p className="mt-3 text-xs text-slate-500">Mau dang chon: {templateLabel(template)}</p>

              {sendState.error ? <p className="mt-3 text-sm text-red-600">{sendState.error}</p> : null}
              {sendState.success ? (
                <p className="mt-3 text-sm text-emerald-700">{sendState.success}</p>
              ) : null}
            </article>
          </section>
        )}

        {activeTab === "inbox" && (
          <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-end gap-3">
              <label className="flex min-w-60 flex-col text-sm text-slate-700">
                Tai khoan hop thu
                <select
                  value={inboxEmail}
                  onChange={(event) => setInboxEmail(event.target.value)}
                  className="mt-1 rounded-xl border border-slate-300 px-3 py-2 outline-none ring-teal-300 focus:ring"
                >
                  <option value="">Chon tai khoan</option>
                  {accounts.map((account) => (
                    <option key={account.email} value={account.email}>
                      {account.email} - {account.displayName} ({roleLabel(account.role)})
                    </option>
                  ))}
                </select>
              </label>

              <button
                onClick={() => void loadInbox(inboxEmail)}
                disabled={!inboxEmail || inboxState.loading}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
              >
                Tai hop thu
              </button>
            </div>

            {inboxState.error ? <p className="text-sm text-red-600">{inboxState.error}</p> : null}
            {inboxState.success ? <p className="text-sm text-emerald-700">{inboxState.success}</p> : null}

            <div className="space-y-3">
              {messages.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                  Chua co email nao trong hop thu nay.
                </p>
              ) : (
                messages.map((message) => {
                  const expanded = expandedMessageId === message.id;
                  return (
                    <article key={message.id} className="rounded-2xl border border-slate-200 p-4">
                      <button
                        onClick={() => setExpandedMessageId(expanded ? null : message.id)}
                        className="w-full text-left"
                      >
                        <p className="text-sm font-semibold text-slate-900">{message.subject}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          Tu {message.from} • {formatDate(message.createdAt)}
                        </p>
                      </button>

                      {expanded ? (
                        <div className="mt-3 space-y-3">
                          <p className="text-xs text-slate-500">Den: {message.to.join(", ")}</p>
                          {message.text ? (
                            <pre className="overflow-auto rounded-xl bg-slate-50 p-3 text-xs text-slate-700">
                              {message.text}
                            </pre>
                          ) : null}
                          {message.html ? (
                            <iframe
                              title={`message-${message.id}`}
                              sandbox=""
                              srcDoc={message.html}
                              className="h-56 w-full rounded-xl border border-slate-200 bg-white"
                            />
                          ) : null}
                        </div>
                      ) : null}
                    </article>
                  );
                })
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
