import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TalentFlow - Nền tảng tuyển dụng & viết CV",
  description: "Kết nối nhân tài và cơ hội nghề nghiệp",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@200..800&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}