import Navbar from "@/components/shared/Navbar";
import Footer from "@/components/shared/Footer";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar /> {/* Header dùng chung */}
      <div className="flex-1">
        {children} {/* Nội dung các trang con sẽ hiện ở đây */}
      </div>
      <Footer /> {/* Footer dùng chung */}
    </div>
  );
}