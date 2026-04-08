export type EmailMode = "test" | "real";

export type FakeAccountRole = "candidate" | "recruiter";

export interface FakeAccount {
  id: string;
  email: string;
  role: FakeAccountRole;
  firstName: string;
  lastName: string;
  fullName: string;
  displayName: string;
  createdAt: string;
}

export type EmailTemplateKind =
  | "otp"
  | "verification"
  | "password-reset"
  | "apply-job"
  | "notification"
  | "custom";

export interface TestInboxMessage {
  id: string;
  subject: string;
  from: string;
  to: string[];
  createdAt: string;
  text: string;
  html: string;
}
