import EmailTestingConsole from "@/components/email-testing/EmailTestingConsole";
import { getEmailMode, getMailpitWebUrl } from "@/lib/email-testing/config";

export default function EmailTestingAccountsPage() {
  return (
    <EmailTestingConsole
      emailMode={getEmailMode()}
      mailpitWebUrl={getMailpitWebUrl()}
      initialTab="accounts"
    />
  );
}
